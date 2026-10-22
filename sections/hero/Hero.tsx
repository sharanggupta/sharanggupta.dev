import BrandMark from "@/components/brand/BrandMark";
import Button from "@/components/ui/Button";
import Container from "@/components/ui/Container";
import Kicker from "@/components/ui/Kicker";
import TextLink from "@/components/ui/TextLink";
import { cssVar } from "@/lib/cssVar";
import { CV, EMAIL_BUTTON_LABEL, PERSON, PROFILES } from "@/content/person";
import HexCluster from "./HexCluster";
import styles from "./Hero.module.css";

const ENTER_STEP_SECONDS = 0.1;

/** Each step delays an element's entrance a little more than the one before. */
function enterAfter(steps: number) {
  return cssVar("--enter-delay", `${steps * ENTER_STEP_SECONDS}s`);
}

/** The top of the page, and the only h1. */
export default function Hero() {
  return (
    <section aria-label="Introduction" className={styles.hero}>
      <HexCluster />
      <Container className="relative">
        <div className={`${styles.enter} flex items-center gap-3 text-accent`} style={enterAfter(0)}>
          <BrandMark size={36} />
          <Kicker>{PERSON.focus}</Kicker>
        </div>
        <h1 className={`${styles.enter} mt-4 text-5xl font-bold tracking-tight sm:text-6xl`} style={enterAfter(1)}>
          {PERSON.name}
        </h1>
        <p className={`${styles.enter} mt-2 text-xl text-accent sm:text-2xl`} style={enterAfter(2)}>
          {PERSON.jobTitle}
        </p>
        <p className={`${styles.enter} mt-4 max-w-xl text-3xl font-medium leading-tight`} style={enterAfter(2)}>
          {PERSON.tagline}
        </p>
        {/* No entrance animation here: the first readable text must paint immediately. */}
        <p className="mt-4 max-w-2xl text-lg text-muted">{PERSON.intro}</p>
        <p className={`${styles.enter} mt-2 text-muted`} style={enterAfter(2)}>
          {PERSON.location}.
        </p>
        <ul className={`${styles.enter} mt-5 flex flex-wrap gap-x-6 gap-y-2`} style={enterAfter(2)}>
          {PROFILES.map((profile) => (
            <li key={profile.label}>
              <TextLink href={profile.href} me>
                {profile.label}
              </TextLink>
            </li>
          ))}
        </ul>
        <p className={`${styles.enter} mt-5 flex flex-wrap gap-3`} style={enterAfter(2)}>
          <Button href={CV.path}>{CV.buttonLabel}</Button>
          <Button href={PERSON.mailto} variant="outline">
            {EMAIL_BUTTON_LABEL}
          </Button>
        </p>
      </Container>
    </section>
  );
}
