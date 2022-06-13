create table users (
  id       bigint       not null,
  name     varchar(200) not null,
  password varchar(128) not null,
  salt     varchar(32)  not null,
  created_on timestamp  not null,
  last_seen timestamp,
  constraint users_pk primary key(id),
  constraint user_u1  unique(name)
);

-----------------------------------------------------------------------------------------------------
create sequence users_sq;

-----------------------------------------------------------------------------------------------------
create or replace procedure save_user(i_user jsonb) as 
$$
begin 
	insert into users(id, name, password, salt, created_on) values 
		(nextval('users_sq'), i_user->>'name', i_user->>'password', i_user->>'salt', current_timestamp);
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_user_by_name(i_param jsonb) returns jsonb as 
$$
declare
	v_res jsonb;
  r_users users%rowtype;
begin 
	select * into r_users from users t where t.name = i_param->>'name';
	v_res = jsonb_object(array['id', r_users.id::text, 'name', r_users.name, 'password', r_users.password, 
														 'salt', r_users.salt, 'last_seen', to_char(r_users.last_seen, 'DD-MM-YYYY HH:MI:SSPM')]);
	return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_user_by_id(i_param jsonb) returns jsonb as 
$$
declare
	v_res jsonb;
  r_users users%rowtype;
begin 
	select * into r_users from users t where t.id = (i_param->>'id')::bigint;
	v_res = jsonb_object(array['id', r_users.id::text, 'name', r_users.name, 'password', r_users.password, 
														 'salt', r_users.salt, 'last_seen', to_char(r_users.last_seen, 'DD-MM-YYYY HH:MI:SSPM')]);
	return v_res;
end;
$$
language plpgsql;