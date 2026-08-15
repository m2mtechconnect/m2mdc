# NVIDIA derivative quality policy

Manifest version 5, generated 2026-08-15T03:56:28Z.
Runtime selection reads `preferredFor` / `runtimePreferred` from the manifest. Filenames and triangle counts are never used to infer quality.

| Logical asset | Role | Ops tris/dc/bytes | LOD tris/dc/bytes | LOD runtimePreferred | Decision |
|---|---|---|---|---|---|
| blank_1u_black | blanking-panel | 1996/1/91356 | 200/1/9572 | True | LOD is cheaper on triangles (200 vs 1996) and transfer (9572 vs 91356 bytes); selected for overview. |
| blank_1u_blackgold | blanking-panel | 2000/1/56380 | 200/1/6872 | True | LOD is cheaper on triangles (200 vs 2000) and transfer (6872 vs 56380 bytes); selected for overview. |
| blank_1u_snapon_gray | blanking-panel | 52/1/3832 | 52/1/3832 | False | LOD rejected: 52 triangles / 3832 bytes against operations 52 / 3832, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| blank_1u_white | blanking-panel | 1998/1/35976 | 200/1/4964 | True | LOD is cheaper on triangles (200 vs 1998) and transfer (4964 vs 35976 bytes); selected for overview. |
| cable_tray_25 | cable-tray | 660/1/32600 | 300/1/14836 | True | LOD is cheaper on triangles (300 vs 660) and transfer (14836 vs 32600 bytes); selected for overview. |
| cable_tray_299 | cable-tray | 804/1/38368 | 300/1/14580 | True | LOD is cheaper on triangles (300 vs 804) and transfer (14580 vs 38368 bytes); selected for overview. |
| cable_tray_tee | cable-tray | 476/1/27928 | 300/1/17152 | True | LOD is cheaper on triangles (300 vs 476) and transfer (17152 vs 27928 bytes); selected for overview. |
| dcp_a_01 | liquid-cooling-equipment | 15360/1/659872 | 4997/1/185580 | True | LOD is cheaper on triangles (4997 vs 15360) and transfer (185580 vs 659872 bytes); selected for overview. |
| qm8700_01 | network-switch | 50752/3/1397316 | 136653/3/4197100 | False | LOD rejected: 136653 triangles / 4197100 bytes against operations 50752 / 1397316, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| qm8700_c_01 | network-switch | 35098/3/1033364 | 57455/3/1935764 | False | LOD rejected: 57455 triangles / 1935764 bytes against operations 35098 / 1033364, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| qm8700_f_01 | network-switch | 36273/3/1056416 | 88476/3/2802568 | False | LOD rejected: 88476 triangles / 2802568 bytes against operations 36273 / 1056416, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| rack_42u_a_01 | liquid-cooled-rack | 59941/2/2646804 | 16456/1/585392 | True | LOD is cheaper on triangles (16456 vs 59941) and transfer (585392 vs 2646804 bytes); selected for overview. |
| rack_42u_a_core | rack-core-reference | 26872/1/899284 | 7998/1/189376 | True | LOD is cheaper on triangles (7998 vs 26872) and transfer (189376 vs 899284 bytes); selected for overview. |
| rpdu_a_01 | rack-pdu | 14925/2/572396 | 2169/2/116600 | True | LOD is cheaper on triangles (2169 vs 14925) and transfer (116600 vs 572396 bytes); selected for overview. |
| server_1u_a | server-1u | 28326/3/783368 | 17066/2/446052 | True | LOD is cheaper on triangles (17066 vs 28326) and transfer (446052 vs 783368 bytes); selected for overview. |
| server_2u_b | server-2u | 27208/4/717288 | 64750/3/1435004 | False | LOD rejected: 64750 triangles / 1435004 bytes against operations 27208 / 717288, draw-call saving 1. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| server_2u_c | server-2u | 27208/4/717284 | 64734/4/1440680 | False | LOD rejected: 64734 triangles / 1440680 bytes against operations 27208 / 717284, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| sn2700c_01 | network-switch | 58397/2/1439596 | 176676/2/5201604 | False | LOD rejected: 176676 triangles / 5201604 bytes against operations 58397 / 1439596, draw-call saving 0. Objectively more expensive with no overview benefit; operations is used at every distance. LOD retained for audit only. |
| sn3700c_01 | network-switch | 47633/3/1556428 | 42614/2/1430268 | True | LOD is cheaper on triangles (42614 vs 47633) and transfer (1430268 vs 1556428 bytes); selected for overview. |
| ua950h_2sf_01 | network-switch | 34751/3/1459908 | 3909/2/144928 | True | LOD is cheaper on triangles (3909 vs 34751) and transfer (144928 vs 1459908 bytes); selected for overview. |
