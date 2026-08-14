"""Batch, budget and semantic-mapping specification for NVIDIA pack ingestion.

Budgets come from the approved ingestion brief. `inspection` retains source
detail and is only ever loaded for an explicitly selected asset.
"""

PACK_ROOT = 'Assets/DigitalTwin/Assets'

# key, category, semantic role, source stage (relative to PACK_ROOT), budgets, flags
ASSETS = [
    # ---- Batch A: low-cost pipeline proof -------------------------------
    ('cable_tray_299', 'cable-tray', 'cable-tray', 'Datacenter/Facilities/Cable_Tray/Cable_Tray_61x299x5cm_A01_01.usd', {'inspection': None, 'operations': 1000, 'lod': 300}, False, 0, 'A'),
    ('cable_tray_25', 'cable-tray', 'cable-tray', 'Datacenter/Facilities/Cable_Tray/Cable_Tray_Segment_25x61x5cm_A01_01.usd', {'inspection': None, 'operations': 1000, 'lod': 300}, False, 0, 'A'),
    ('cable_tray_tee', 'cable-tray', 'cable-tray', 'Datacenter/Facilities/Cable_Tray/Cable_Tray_Tee_A01_01.usd', {'inspection': None, 'operations': 1000, 'lod': 300}, False, 0, 'A'),
    ('rpdu_a_01', 'rack-pdu', 'rack-pdu', 'Datacenter/Power_Distribution/Controllers/PDU_A/rPDU_A_01.usd', {'inspection': None, 'operations': 15000, 'lod': 2000}, True, 0, 'A'),
    ('blank_1u_black', 'blanking-panel', 'blanking-panel', 'Datacenter/Racks/Accessories/Blank_1U_Black_A_01.usd', {'inspection': None, 'operations': 2000, 'lod': 200}, False, 0, 'A'),
    ('blank_1u_blackgold', 'blanking-panel', 'blanking-panel', 'Datacenter/Racks/Accessories/Blank_1U_BlackGold_A_01.usd', {'inspection': None, 'operations': 2000, 'lod': 200}, False, 0, 'A'),
    ('blank_1u_snapon_gray', 'blanking-panel', 'blanking-panel', 'Datacenter/Racks/Accessories/Blank_1U_Snap_on_Gray_A_01.usd', {'inspection': None, 'operations': 2000, 'lod': 200}, False, 0, 'A'),
    ('blank_1u_white', 'blanking-panel', 'blanking-panel', 'Datacenter/Racks/Accessories/Blank_1U_White_A_01.usd', {'inspection': None, 'operations': 2000, 'lod': 200}, False, 0, 'A'),
    # ---- Batch B: cooling + rack core -----------------------------------
    ('dcp_a_01', 'liquid-cooling', 'liquid-cooling-equipment', 'Datacenter/Liquid_Cooling/Data_Hall/DCP_A/DCP_A_01.usd', {'inspection': None, 'operations': 25000, 'lod': 5000}, True, 0, 'B'),
    ('rack_42u_a_01', 'rack', 'liquid-cooled-rack', 'Datacenter/Racks/Rack_42U_A/Rack_42U_A_01.usd', {'inspection': None, 'operations': 60000, 'lod': 8000}, False, -90, 'B'),
    ('rack_42u_a_core', 'rack-core', 'rack-core-reference', 'Datacenter/Racks/Rack_42U_A/Rack_42U_A_01.usd', {'inspection': None, 'operations': 60000, 'lod': 8000}, False, -90, 'B'),
    # ---- Batch C: servers -------------------------------------------------
    ('server_1u_a', 'server', 'server-1u', 'Datacenter/Server_Nodes/Servers/Server_1U_A_01.usd', {'inspection': None, 'operations': 25000, 'lod': 3000}, True, 0, 'C'),
    ('server_2u_b', 'server', 'server-2u', 'Datacenter/Server_Nodes/Servers/Server_2U_B_01.usd', {'inspection': None, 'operations': 25000, 'lod': 3000}, True, 0, 'C'),
    ('server_2u_c', 'server', 'server-2u', 'Datacenter/Server_Nodes/Servers/Server_2U_C_01.usd', {'inspection': None, 'operations': 25000, 'lod': 3000}, True, 0, 'C'),
    # ---- Batch D: network -------------------------------------------------
    ('qm8700_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/QM8700/QM8700_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
    ('qm8700_c_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/QM8700/QM8700_C_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
    ('qm8700_f_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/QM8700/QM8700_F_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
    ('sn2700c_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/SN2700/SN2700C_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
    ('sn3700c_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/SN3700/SN3700C_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
    ('ua950h_2sf_01', 'network-switch', 'network-switch', 'Datacenter/Network_Switches/NVIDIA/UA950H-2SF/UA950H-2SF_01.usd', {'inspection': None, 'operations': 35000, 'lod': 4000}, True, 0, 'D'),
]

FIELDS = ('key', 'category', 'semanticRole', 'source', 'budgets', 'stripInternal', 'rotationY', 'batch')

# Component selection for AURA-authored derivatives. Anchored on verified USD
# prim names, never on assumed naming: the Rack_42U_A chassis sits beneath a
# node named Rack_42RU_Rear_Door_V2_Component_01, so only the real
# /Rear_Cooler_Door subtree (frame, fan assembly, chilled-water lines, label)
# is excluded.
EXCLUDE_ANCESTORS = {
    'rack_42u_a_core': ['Rear_Cooler_Door'],
}


def assets(batch=None):
    for row in ASSETS:
        rec = dict(zip(FIELDS, row))
        if batch is None or rec['batch'] == batch:
            yield rec
