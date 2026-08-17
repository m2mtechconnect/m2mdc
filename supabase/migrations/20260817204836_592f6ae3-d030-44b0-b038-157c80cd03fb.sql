insert into public.connector_definitions (id,name,category,provider,publication_status,availability,implementation_status)
values ('aura_test_probe_connector','AURA Test Probe Connector','TEST','AURA','PUBLISHED','UNAVAILABLE','PLANNED'),
       ('aura_test_probe_unpublished','AURA Test Probe Unpublished','TEST','AURA','DRAFT','UNAVAILABLE','PLANNED')
on conflict (id) do update set publication_status=excluded.publication_status;

update public.profiles set org_id='11111111-1111-1111-1111-1111111111a1' where user_id='59d772b9-15e7-48ca-b649-51d0f8f33649';
update public.profiles set org_id='22222222-2222-2222-2222-2222222222b1' where user_id='13895451-bc91-4835-975d-0a76e9d1217f';

insert into public.connection_data_contracts (connector_id,schema_type,schema_version,tenant_id,validation_status)
values ('aura_test_probe_connector','ISOLATION_PROBE_TENANT_A','1.0.0','11111111-1111-1111-1111-1111111111a1','VALIDATED'),
       ('aura_test_probe_connector','ISOLATION_PROBE_TENANT_B','1.0.0','22222222-2222-2222-2222-2222222222b1','VALIDATED');

insert into public.connection_instances (connector_id,tenant_id,display_name,environment,status)
values ('aura_test_probe_connector','11111111-1111-1111-1111-1111111111a1','ISOLATION_PROBE_TENANT_A','test','DRAFT'),
       ('aura_test_probe_connector','22222222-2222-2222-2222-2222222222b1','ISOLATION_PROBE_TENANT_B','test','DRAFT');

insert into public.connection_health_checks (connection_id,check_type,status,safe_message)
select id,'PROBE','SUCCESS',display_name from public.connection_instances where display_name like 'ISOLATION_PROBE_TENANT_%';

insert into public.connection_audit_events (connection_id,tenant_id,action,new_state,correlation_id)
select id,tenant_id,'ISOLATION_PROBE','SUCCESS',display_name from public.connection_instances where display_name like 'ISOLATION_PROBE_TENANT_%';