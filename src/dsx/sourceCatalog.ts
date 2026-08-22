/**
 * Approved discovery sources for NVIDIA DSX asset intake.
 *
 * This registry never makes content redistributable. It records where source
 * material comes from, how it is governed, and what AURA is allowed to do
 * before legal/licence review authorises any broader use.
 */

export interface DsxSourcePack {
  id: string;
  publisher: 'NVIDIA';
  title: string;
  version: string;
  catalogUrl: string;
  blueprintRepositoryUrl: string;
  expectedRootStage: string;
  compressedSizeGb: number;
  signed: boolean;
  licenceLabel: string;
  intendedUse: string;
  repositoryPolicy: 'private-intake-only';
  productionUse: 'not-established';
  redistribution: 'not-established';
  notes: string[];
}

export const NVIDIA_DSX_CONTENT_PACK: DsxSourcePack = Object.freeze({
  id: 'nvidia.omniverse.dsx_dataset',
  publisher: 'NVIDIA',
  title: 'Omniverse DSX Blueprint for AI Factories',
  version: '2.1',
  catalogUrl: 'https://catalog.ngc.nvidia.com/orgs/nvidia/omniverse/resources/dsx_dataset/2.1',
  blueprintRepositoryUrl:
    'https://github.com/NVIDIA-Omniverse-blueprints/omniverse-dsx-blueprint-for-ai-factories',
  expectedRootStage: 'DSX_BP/Assembly/DSX_Main_BP.usda',
  compressedSizeGb: 32.69,
  signed: true,
  licenceLabel: 'NVIDIA Sample Data License for Evaluation',
  intendedUse: 'Developer sample/evaluation of the Omniverse DSX Blueprint and AI-factory digital twin.',
  repositoryPolicy: 'private-intake-only',
  productionUse: 'not-established',
  redistribution: 'not-established',
  notes: [
    'The NGC catalogue describes the dataset as demonstration content and not for production use.',
    'Do not commit the downloaded content pack, extracted USD files, textures, or derived proprietary geometry to this public repository.',
    'A legal/licence review must establish production and redistribution rights before any broader publication or deployment of content-pack geometry.',
    'AURA may record non-secret provenance metadata such as pack version, approved checksums, source identifiers, and validation results after review.',
  ],
});

export function canPublishDsxSourceGeometry(source: DsxSourcePack): boolean {
  return source.redistribution !== 'not-established';
}

export function canUseDsxSourceInProduction(source: DsxSourcePack): boolean {
  return source.productionUse !== 'not-established';
}
