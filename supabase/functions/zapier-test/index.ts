import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { retiredEndpoint } from '../_shared/retiredEndpoint.ts';

serve(retiredEndpoint);
