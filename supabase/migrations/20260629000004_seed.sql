-- ============================================================================
-- Mesa — idempotent demo seed
-- Reproduces DEMO_CAFE ("Kape Kalye", brew) and DEMO_CAFE_STARTER
-- ("Tindahan Coffee", starter) from src/lib/data.ts so /m/demo and
-- /m/demo-starter render identically once the read path is flipped to the DB.
-- Safe to re-run: keyed on cafes.slug; menu/promos are reset each run.
-- ============================================================================

-- ---- helpers (demo-only, service_role) -------------------------------------
create or replace function public.link_tags(p_item uuid, p_cafe uuid, p_keys text[])
returns void language sql volatile security definer set search_path = public as $$
  insert into public.menu_item_tags (menu_item_id, tag_id)
  select p_item, t.id from public.menu_tags t
  where t.cafe_id = p_cafe and t.key = any(p_keys)
  on conflict do nothing;
$$;

create or replace function public.add_coffee_options(p_item uuid, p_cafe uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare g uuid;
begin
  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Size', true, false, 0) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Small', 0, 0), (g, p_cafe, 'Medium', 20, 1), (g, p_cafe, 'Large', 40, 2);

  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Milk', true, false, 1) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Whole milk', 0, 0), (g, p_cafe, 'Oat milk', 30, 1), (g, p_cafe, 'Almond milk', 30, 2);

  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (p_item, p_cafe, 'Add-ons', false, true, 2) returning id into g;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (g, p_cafe, 'Extra shot', 40, 0), (g, p_cafe, 'Vanilla syrup', 25, 1);
end;
$$;

create or replace function public.seed_demo_menu(p_cafe_id uuid)
returns void language plpgsql volatile security definer set search_path = public as $$
declare
  v_hot uuid; v_iced uuid; v_sweet uuid; v_kitchen uuid;
  v_item uuid; v_grp uuid;
  b text := 'https://images.unsplash.com/';
  q text := '?w=600&q=72&auto=format&fit=crop';
begin
  -- reset menu content (cascade clears option_*/menu_item_tags)
  delete from public.menu_items where cafe_id = p_cafe_id;
  delete from public.categories where cafe_id = p_cafe_id;
  perform public.seed_preset_tags(p_cafe_id);

  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Hot Coffee', 0)   returning id into v_hot;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Iced Coffee', 1)  returning id into v_iced;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Sweet Things', 2) returning id into v_sweet;
  insert into public.categories (cafe_id, name, position) values (p_cafe_id, 'Kitchen', 3)      returning id into v_kitchen;

  -- Hot Coffee
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, badge, best, position)
    values (p_cafe_id, v_hot, 'Flat White', 130, 'Slow-pulled espresso, steamed milk, a little foam.',
            b||'photo-1541167760496-1628856ab772'||q, 'Bestseller', true, 0) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_hot, 'Cappuccino', 120, 'Equal parts espresso, steamed milk, and airy foam.',
            b||'photo-1572442388796-11668a67e53d'||q, 1) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_hot, 'Salted Caramel Latte', 150, 'House caramel, a pinch of sea salt, velvety milk.',
            b||'photo-1534687941688-651ccaafbff8'||q, 2) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  -- Iced Coffee
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, badge, position)
    values (p_cafe_id, v_iced, 'Iced Spanish Latte', 150, 'Sweet condensed milk over a double shot, lots of ice.',
            b||'photo-1461023058943-07fcbe16d735'||q, 'New', 0) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_iced, 'Iced Latte', 140, 'Smooth espresso, cold milk, slow melt.',
            b||'photo-1517701550927-30cf4ba1dba5'||q, 1) returning id into v_item;
  perform public.add_coffee_options(v_item, p_cafe_id);
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy']);

  -- Sweet Things
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_sweet, 'Butter Croissant', 95, 'Baked this morning. Flaky, buttery, warm.',
            b||'photo-1555507036-ab1f4038808a'||q, 0) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_sweet, 'Raspberry Cream Cake', 165, 'Soft sponge, fresh cream, tart raspberries.',
            b||'photo-1565958011703-44f9829ba187'||q, 1) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, sold_out, position)
    values (p_cafe_id, v_sweet, 'Brown Butter Cookies', 80, 'Crisp edges, gooey middle, dark chocolate.',
            b||'photo-1499636136210-6f4ee915583e'||q, true, 2) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten','nuts']);

  -- Kitchen
  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_kitchen, 'Pulled Pork Sandwich', 220, 'Slow-cooked pork, slaw, toasted brioche.',
            b||'photo-1606755962773-d324e0a13086'||q, 0) returning id into v_item;
  insert into public.option_groups (menu_item_id, cafe_id, label, required, multi, position)
    values (v_item, p_cafe_id, 'Add-ons', false, true, 0) returning id into v_grp;
  insert into public.option_choices (option_group_id, cafe_id, label, price_delta, position) values
    (v_grp, p_cafe_id, 'Make it a combo (fries + drink)', 90, 0),
    (v_grp, p_cafe_id, 'Extra slaw', 20, 1);
  perform public.link_tags(v_item, p_cafe_id, array['gluten','spicy']);

  insert into public.menu_items (cafe_id, category_id, name, price, descr, img, position)
    values (p_cafe_id, v_kitchen, 'Sourdough & Eggs', 195, 'House sourdough, soft eggs, salted butter.',
            b||'photo-1509440159596-0249088772ff'||q, 1) returning id into v_item;
  perform public.link_tags(v_item, p_cafe_id, array['vegetarian','dairy','gluten']);
end;
$$;

revoke all on function public.link_tags(uuid, uuid, text[]) from public, anon, authenticated;
revoke all on function public.add_coffee_options(uuid, uuid) from public, anon, authenticated;
revoke all on function public.seed_demo_menu(uuid) from public, anon, authenticated;

-- ---- create the two demo cafes + content -----------------------------------
do $$
declare
  c_demo uuid; a_demo uuid;
  c_star uuid; a_star uuid;
  cover_base text := 'https://images.unsplash.com/';
  cover_q    text := '?w=1200&q=72&auto=format&fit=crop';
begin
  -- Kape Kalye — Brew, warm, accepting orders, published.
  select id, account_id into c_demo, a_demo from public.cafes where slug = 'demo';
  if c_demo is null then
    insert into public.accounts (name, plan, plan_status) values ('Kape Kalye', 'brew', 'active')
      returning id into a_demo;
    insert into public.cafes (account_id, slug, name, tagline, intro, hours, cover, theme,
                              order_mode, accepting_orders, published)
      values (a_demo, 'demo', 'Kape Kalye',
              'Neighborhood coffee · San Fernando, Pampanga',
              'Slow coffee, fresh pastries, and a quiet corner — made for staying a while.',
              'Open today · 7:00am – 10:00pm',
              cover_base||'photo-1554118811-1e0d58224f24'||cover_q,
              'warm', null, true, true)
      returning id into c_demo;
  else
    update public.accounts set plan = 'brew', plan_status = 'active' where id = a_demo;
    update public.cafes set name = 'Kape Kalye',
           tagline = 'Neighborhood coffee · San Fernando, Pampanga',
           intro = 'Slow coffee, fresh pastries, and a quiet corner — made for staying a while.',
           hours = 'Open today · 7:00am – 10:00pm',
           theme = 'warm', order_mode = null, published = true,
           accepting_orders = true where id = c_demo;
  end if;
  insert into public.brand_kits (cafe_id) values (c_demo) on conflict (cafe_id) do nothing;
  perform public.seed_demo_menu(c_demo);

  delete from public.promos where cafe_id = c_demo;
  insert into public.promos (cafe_id, title, descr, period, active, tone, position) values
    (c_demo, 'Merienda hour', '2–5 PM · ₱20 off any pastry with a hot drink.', 'Daily · 2:00–5:00 PM', true, 'highlight', 0),
    (c_demo, 'Student Tuesdays', '10% off for students, all day Tuesday.', 'Every Tuesday', true, 'brand', 1),
    (c_demo, 'Rainy-day soup set', 'Free soup with any sandwich when it rains.', 'Seasonal · paused', false, 'neutral', 2);

  -- Tindahan Coffee — Starter, minimal, browse-only, published.
  select id, account_id into c_star, a_star from public.cafes where slug = 'demo-starter';
  if c_star is null then
    insert into public.accounts (name, plan, plan_status) values ('Tindahan Coffee', 'starter', 'active')
      returning id into a_star;
    insert into public.cafes (account_id, slug, name, tagline, intro, hours, cover, theme,
                              order_mode, accepting_orders, published)
      values (a_star, 'demo-starter', 'Tindahan Coffee',
              'Small-batch roasts · Angeles, Pampanga',
              'Small-batch roasts and simple, honest food, served all day.',
              'Open today · 8:00am – 9:00pm',
              cover_base||'photo-1453614512568-c4024d13c247'||cover_q,
              'minimal', 'browse', true, true)
      returning id into c_star;
  else
    update public.accounts set plan = 'starter', plan_status = 'active' where id = a_star;
    update public.cafes set name = 'Tindahan Coffee',
           tagline = 'Small-batch roasts · Angeles, Pampanga',
           intro = 'Small-batch roasts and simple, honest food, served all day.',
           hours = 'Open today · 8:00am – 9:00pm',
           theme = 'minimal', order_mode = 'browse',
           published = true where id = c_star;
  end if;
  insert into public.brand_kits (cafe_id) values (c_star) on conflict (cafe_id) do nothing;
  perform public.seed_demo_menu(c_star);
end;
$$;
