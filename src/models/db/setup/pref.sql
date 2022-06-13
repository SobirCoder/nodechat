---------------------------------------------------------------------------
create or replace function c_msg_type_text() returns text as 
$$
begin      
  return 'T';
end;
$$
language plpgsql;

---------------------------------------------------------------------------
create or replace function c_msg_type_file() returns text as 
$$
begin      
  return 'F';
end;
$$
language plpgsql;