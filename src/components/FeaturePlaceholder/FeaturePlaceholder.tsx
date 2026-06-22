import type { ReactNode } from 'react'
import styles from './FeaturePlaceholder.module.css'

type FeaturePlaceholderProps = {
  eyebrow: string
  title: string
  description: string
  children?: ReactNode
}

export function FeaturePlaceholder({
  eyebrow,
  title,
  description,
  children,
}: FeaturePlaceholderProps) {
  return (
    <section className={styles.layout}>
      <div className={styles.copy}>
        <p className={styles.eyebrow}>{eyebrow}</p>
        <h1>{title}</h1>
        <p className={styles.description}>{description}</p>
      </div>
      <div className={styles.panel}>{children}</div>
    </section>
  )
}
