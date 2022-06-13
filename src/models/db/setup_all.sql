create table users (
  id       bigint       not null,
  name     varchar(200) not null,
  password varchar(128) not null,
  salt     varchar(32)  not null,
  created_on timestamp  not null,
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

-----------------------------------------------------------------------------------------------------
-- chat_setup
-----------------------------------------------------------------------------------------------------
-- pref.sql
-----------------------------------------------------------------------------------------------------
create or replace function c_msg_type_text() returns text as 
$$
begin      
  return 'T';
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function c_msg_type_file() returns text as 
$$
begin      
  return 'F';
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
-- util
-----------------------------------------------------------------------------------------------------
create or replace procedure jsb_insert(i_var inout jsonb, i_key text, i_value text) as
$$
begin
  i_var = jsonb_insert(i_var, array[i_key], to_jsonb(i_value));
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
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

-----------------------------------------------------------------------------------------------------
create table files (
  file_id    bigint        not null,
  iv         varchar(32)   not null,
  path       varchar(4000) not null,
  name       varchar(300)  not null,
  constraint files_pk primary key(file_id),
  constraint files_u1 unique(path)
);

-----------------------------------------------------------------------------------------------------
create table messages (
  message_id    bigint not null,
  sender_id     bigint not null,
  receiver_id   bigint not null,
  msg_type      varchar(1) not null,
  sent_at       timestamp not null,
  msg           varchar(500),
  file_id       bigint,
  constraint messages_pk primary key(message_id),
  constraint messages_u1 unique(message_id, receiver_id),
  constraint messages_f1 foreign key(sender_id) references users(id),
  constraint messages_f2 foreign key(receiver_id) references users(id),
  constraint messages_f3 foreign key(file_id) references files(file_id),
  constraint messages_c1 check(msg_type in ('T', 'F')),
  constraint messages_c2 check(msg_type = 'T' and msg is not null or msg_type = 'F' and file_id is not null)
);

-----------------------------------------------------------------------------------------------------
create table m_queue(
  message_id  bigint  not null,
  receiver_id bigint  not null,
  constraint m_queue_pk primary key(message_id, receiver_id),
  constraint m_queue_f1 foreign key(message_id, receiver_id) references messages(message_id, receiver_id)
);

-----------------------------------------------------------------------------------------------------
create sequence files_sq;
create sequence messages_sq;


-----------------------------------------------------------------------------------------------------
create or replace function save_file(i_file jsonb) returns bigint as
$$
declare
  v_file_id bigint := nextval('files_sq');
begin
  insert into files(file_id, iv, path, name) values (v_file_id, i_file->>'iv', i_file->>'path', i_file->>'name');
  return v_file_id;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_file(i_file jsonb) returns jsonb as
$$
declare
	r_file files%rowtype;
  v_res jsonb = '{}';
begin
	select * into r_file from files t where t.file_id = (i_file->>'file_id')::bigint;
  v_res = jsonb_object(array['file_id', (r_file.file_id)::text, 'iv', r_file.iv, 'path', r_file.path,
                             'name', r_file.name]);
  return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function save_message(i_msg jsonb) returns bigint as 
$$
declare
  v_message_id bigint;
begin      
  v_message_id := nextval('messages_sq');

  insert into messages(message_id, sender_id, receiver_id, msg_type, sent_at, msg, file_id)
  values (v_message_id, (i_msg->>'sender_id')::bigint, (i_msg->>'receiver_id')::bigint,
          i_msg->>'msg_type', current_timestamp, i_msg->>'msg', (i_msg->>'file_id')::bigint);

  return v_message_id;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_message(i_msg jsonb) returns jsonb as 
$$
declare
  r_msg messages%rowtype;
  r_file files%rowtype;
  v_sender_name varchar(200);
  v_receiver_name varchar(200);
  v_res jsonb = '{}';
begin      
  select * into r_msg from messages t where t.message_id = (i_msg->>'message_id')::bigint;
  v_res = jsonb_object(array['message_id', (r_msg.message_id)::text, 'sender_id', (r_msg.sender_id)::text,
                             'receiver_id', (r_msg.receiver_id)::text, 'msg_type', r_msg.msg_type]);

  select name into v_sender_name from users t where t.id = r_msg.sender_id;
  select name into v_receiver_name from users t where t.id = r_msg.receiver_id;
  call jsb_insert(v_res, 'sender_name', v_sender_name);
  call jsb_insert(v_res, 'receiver_name', v_receiver_name);

  call jsb_insert(v_res, 'sent_at', to_char(r_msg.sent_at, 'DD.MM.YYYY HH24:mi'));

  if r_msg.msg_type = c_msg_type_text() then
    call jsb_insert(v_res, 'msg', r_msg.msg);
    call jsb_insert(v_res, 'message_type', 'message');
  else
    select * into strict r_file from files t where t.file_id = r_msg.file_id;
    call jsb_insert(v_res, 'message_type', 'file');
    call jsb_insert(v_res, 'file_id', r_file.file_id::text);
    call jsb_insert(v_res, 'file_name', r_file.name);
  end if;
  
  return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace procedure save_queue(i_queue jsonb) as
$$
begin
  insert into m_queue(message_id, receiver_id) 
  values ((i_queue->>'message_id')::bigint, (i_queue->>'receiver_id')::bigint);
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace procedure delete_queue(i_param jsonb) as
$$
declare
  v_receiver_id bigint := (i_param->>'receiver_id')::bigint;
  v_sender_id bigint := (i_param->>'sender_id')::bigint;
begin
  delete from m_queue t
  where t.receiver_id = v_receiver_id
    and exists (select 1 from messages w 
                where w.message_id = t.message_id 
                  and w.receiver_id = t.receiver_id 
                  and w.sender_id = v_sender_id);
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_queued_msg(i_param jsonb) returns jsonb as 
$$
declare
  r record;
  v_res jsonb = '[]'::jsonb;
begin
  for r in (select t.message_id from m_queue t 
            where t.receiver_id = (i_param->>'receiver_id')::bigint) loop
    call jsba_add(v_res, get_message(jsonb_object(array['message_id', r.message_id::text])));
  end loop;

  return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_p2p_chats(i_param jsonb) returns jsonb as 
$$
declare
  r_peer users%rowtype;
  v_user_id bigint := (i_param->>'user_id')::bigint;
  r record;
  v_res jsonb = '[]'::jsonb;
begin
  for r in (select z.peer_user_id 
             from (select (case when t.sender_id = v_user_id then t.receiver_id
                           else t.sender_id end) peer_user_id from messages t
                  where t.sender_id = v_user_id or 
                        t.receiver_id = v_user_id) z
            group by z.peer_user_id) loop
    select * into strict r_peer from users t where t.id = r.peer_user_id;

    call jsba_add(v_res, jsonb_object(array['user_id', r_peer.id::text, 'name', r_peer.name]));
  end loop;

  return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function get_p2p_chat(i_param jsonb) returns jsonb as 
$$
declare
  r record;
  v_user_id bigint := (i_param->>'user_id')::bigint;
  v_peer_user_id bigint := (i_param->>'peer_user_id')::bigint;
  v_res jsonb = '[]'::jsonb;
begin
  for r in (select t.message_id
            from messages t
            where (t.sender_id = v_user_id
              and t.receiver_id = v_peer_user_id) or
              (t.sender_id = v_peer_user_id
              and t.receiver_id = v_user_id)
            order by t.sent_at) loop
    call jsba_add(v_res, get_message(jsonb_object(array['message_id', r.message_id::text])));
  end loop;

  return v_res;
end;
$$
language plpgsql;

-----------------------------------------------------------------------------------------------------
create or replace function search_user(i_param jsonb) returns jsonb as 
$$
declare
  r record;
  v_res jsonb = '[]'::jsonb;
begin
  for r in (select * from users t 
            where t.name ~* ('.*' || (i_param->>'name') || '.*' )) loop
    call jsba_add(v_res, jsonb_object(array['id', r.id, 'name', t.name]));
  end loop;

  return v_res;
end;
$$
language plpgsql;