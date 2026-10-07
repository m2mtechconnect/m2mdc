import m2mLogo from '@/assets/m2m-logo.png';

/** Corporate attribution belongs only to the public marketing surface. */
export function MarketingParentBrand() {
  return <a className="dc-footer-powered" href="https://m2mtechconnect.com/" aria-label="Powered by M2M Tech — corporate website"><img className="dc-m2m-logo" src={m2mLogo} width="40" height="40" alt="" loading="lazy"/><span>Powered by <strong>M2M Tech</strong></span></a>;
}
