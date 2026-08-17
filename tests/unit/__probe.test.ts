import { describe, it } from 'vitest';
import { templateToBlueprint } from '@/lib/builder/templateToBlueprint';
import { dataCentreDigitalTwinTemplate } from '../fixtures/templates';
describe('probe', () => { it('p', () => {
  const b: any = templateToBlueprint(dataCentreDigitalTwinTemplate as any, 'marketplace');
  console.log(JSON.stringify({templateId:b.templateId,templateName:b.templateName,certified:b.certified,rating:b.rating,downloads:b.downloads,industry:b.industry,type:b.type,expectedRoi:b.expectedRoi,goals:b.goals,tools:b.tools,triggers:b.workflow.triggers.length,actions:b.workflow.actions.length,tags:b.tags,timeSaved:b.timeSavedPerWeek,eff:b.efficiencyGain,provider:b.model.provider,style:b.behavior.communicationStyle},null,1));
});});
