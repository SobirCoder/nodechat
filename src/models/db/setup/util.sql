---------------------------------------------------------------------------
create or replace procedure jsb_insert(i_var inout jsonb, i_key text, i_value text) as
$$
begin
  i_var = jsonb_insert(i_var, array[i_key], to_jsonb(i_value));
end;
$$
language plpgsql;

---------------------------------------------------------------------------
drop procedure jsba_add(jsonb, jsonb);
create or replace procedure jsba_add(i_arr inout jsonb, i_item jsonb) as
$$
declare
	length int;
begin
	length := jsonb_array_length(i_arr) + 1;
  i_arr := jsonb_set(i_arr, array[length::text], i_item);
end;
$$
language plpgsql;