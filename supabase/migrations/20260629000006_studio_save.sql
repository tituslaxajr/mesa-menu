-- ============================================================================
-- Mesa — Studio save: transactional menu replace
-- Saving the menu touches categories + items + option groups/choices + tag links
-- across several tables. Doing that as separate client requests risks a partial
-- write, so it's one SECURITY DEFINER function that replaces the café's menu
-- atomically. Authorization is checked INSIDE via can_manage_cafe(auth.uid()),
-- so only an owner/manager of this café (or a platform admin) can run it.
--
-- Brand kit, café profile, and promos are single-table writes done directly from
-- Server Actions under RLS (no function needed).
--
-- p_categories : jsonb array of category names, in display order (no "All").
-- p_items      : jsonb array of
--   { name, price, descr, img, badge, sold_out, best, cat,
--     options:[ {label,required,multi, choices:[{label,price_delta}]} ],
--     tags:[ {key,label,emoji} ] }
-- ============================================================================

create or replace function public.save_cafe_menu(
  p_cafe_id    uuid,
  p_categories jsonb,
  p_items      jsonb
) returns void language plpgsql security definer set search_path = public as $$
declare
  cat_map  jsonb := '{}'::jsonb;
  v_cat    text;
  v_cat_id uuid;
  v_item   jsonb;
  v_grp    jsonb;
  v_choice jsonb;
  v_tag    jsonb;
  v_item_id uuid;
  v_grp_id  uuid;
  v_tag_id  uuid;
  v_pos int := 0;
  v_i   int := 0;
  v_gi  int := 0;
  v_ci  int := 0;
begin
  if not public.can_manage_cafe(p_cafe_id) then
    raise exception 'not authorized to edit this cafe';
  end if;

  -- Wipe current menu (cascades option groups/choices + tag links).
  delete from public.menu_items where cafe_id = p_cafe_id;
  delete from public.categories where cafe_id = p_cafe_id;

  -- Categories in order → name→id map for item linking.
  for v_cat in select value from jsonb_array_elements_text(p_categories) loop
    insert into public.categories (cafe_id, name, position)
      values (p_cafe_id, v_cat, v_pos) returning id into v_cat_id;
    cat_map := jsonb_set(cat_map, array[v_cat], to_jsonb(v_cat_id::text));
    v_pos := v_pos + 1;
  end loop;

  -- Upsert every tag referenced by an item, so custom tags persist.
  for v_item in select value from jsonb_array_elements(p_items) loop
    for v_tag in select value from jsonb_array_elements(coalesce(v_item->'tags', '[]'::jsonb)) loop
      insert into public.menu_tags (cafe_id, key, label, emoji, is_preset)
        values (p_cafe_id, v_tag->>'key', v_tag->>'label', v_tag->>'emoji', false)
        on conflict (cafe_id, key) do update
          set label = excluded.label, emoji = excluded.emoji;
    end loop;
  end loop;

  -- Items, in array order, with nested options/choices and tag links.
  v_i := 0;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.menu_items
      (cafe_id, category_id, name, price, descr, img, badge, sold_out, best, position)
    values (
      p_cafe_id,
      nullif(cat_map->>(v_item->>'cat'), '')::uuid,
      coalesce(v_item->>'name', ''),
      coalesce((v_item->>'price')::int, 0),
      coalesce(v_item->>'descr', ''),
      nullif(v_item->>'img', ''),
      nullif(v_item->>'badge', ''),
      coalesce((v_item->>'sold_out')::boolean, false),
      coalesce((v_item->>'best')::boolean, false),
      v_i
    ) returning id into v_item_id;

    v_gi := 0;
    for v_grp in select value from jsonb_array_elements(coalesce(v_item->'options', '[]'::jsonb)) loop
      insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
        values (v_item_id, p_cafe_id, v_grp->>'label',
                coalesce((v_grp->>'required')::boolean, false),
                coalesce((v_grp->>'multi')::boolean, false), v_gi)
        returning id into v_grp_id;
      v_ci := 0;
      for v_choice in select value from jsonb_array_elements(coalesce(v_grp->'choices', '[]'::jsonb)) loop
        insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position)
          values (v_grp_id, p_cafe_id, v_choice->>'label',
                  coalesce((v_choice->>'price_delta')::int, 0), v_ci);
        v_ci := v_ci + 1;
      end loop;
      v_gi := v_gi + 1;
    end loop;

    for v_tag in select value from jsonb_array_elements(coalesce(v_item->'tags', '[]'::jsonb)) loop
      select id into v_tag_id from public.menu_tags
        where cafe_id = p_cafe_id and key = v_tag->>'key';
      if v_tag_id is not null then
        insert into public.menu_item_tags (menu_item_id, tag_id)
          values (v_item_id, v_tag_id) on conflict do nothing;
      end if;
    end loop;

    v_i := v_i + 1;
  end loop;
end;
$$;

revoke all on function public.save_cafe_menu(uuid, jsonb, jsonb) from public, anon;
grant execute on function public.save_cafe_menu(uuid, jsonb, jsonb) to authenticated;
