/**
 * TwinSecondaryCapabilities - compact three-up grid for the remaining
 * operational views, so the page keeps every real screenshot without
 * repeating seven full-width feature blocks.
 * Presentation only. All frames are labelled as simulated output.
 */

import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { SectionHeading } from './SectionHeading';
import { ParallaxImage } from "./Parallax";

export interface SecondaryCapability {
  title: string;
  body: string;
  imageSrc: string;
  imageAlt: string;
  imageWidth: number;
  imageHeight: number;
}

export function TwinSecondaryCapabilities({ items }: { items: SecondaryCapability[] }) {
  const { t } = useTranslation();

  return (
    <section className="bg-[#0A0A0A] py-20 lg:py-28">
      <div className="mx-auto max-w-7xl px-4 lg:px-8">
        <SectionHeading
          surface="dark"
          eyebrow={t('landing.moreCapabilitiesEyebrow')}
          title={t('landing.moreCapabilitiesTitle')}
          lede={t('landing.moreCapabilitiesLede')}
        />

        <ul className="mt-14 grid gap-10 lg:grid-cols-3">
          {items.map((item, index) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.45, delay: index * 0.08 }}
            >
              <ParallaxImage
                src={item.imageSrc}
                alt={item.imageAlt}
                width={item.imageWidth}
                height={item.imageHeight}
                containerClassName="aspect-[16/10] border border-white/10"
              />
              <span className="mt-5 block font-mono text-xs text-success">
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 text-lg font-semibold text-[#F5F7FA]">{item.title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#C9CDD3]">{item.body}</p>
            </motion.li>
          ))}
        </ul>

      </div>
    </section>
  );
}
