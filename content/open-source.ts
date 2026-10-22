// Open-source contributions. The list itself comes from GitHub (lib/github/pull-requests.ts): every
// pull request merged in a repository that is not mine. This file holds only what GitHub cannot know:
// which projects matter most, and for each contribution what the problem was and how it was fixed.
// A new merged pull request appears on /open-source by itself; a note here adds the story.

import type { PullRequestFacts, PullRequests } from "../lib/github/pull-requests.ts";

/** What a contribution did, which decides the group it is shown in on /open-source. */
export const KIND = { fix: "fix", feature: "feature", docs: "docs", tests: "tests" } as const;

export type Kind = (typeof KIND)[keyof typeof KIND];

export type Project = { name: string; repo: string; url: string };

export type Reference = { label: string; url: string };

/** What is written here about one pull request. Everything is optional: GitHub supplies the rest. */
export type Note = {
  kind?: Kind;
  /** One sentence for the home page and the README, in the present tense: what is true now. */
  summary?: string;
  /** What was wrong, or missing, before. */
  problem?: string;
  /** What the change does about it, and how it was verified. */
  fix?: string;
  /** Overrides the issue read from the pull request body. */
  issue?: Reference;
  /** Shown on the home page and in the README. Needs a summary. */
  featured?: true;
};

/** A change the maintainers applied themselves from a pull request, which GitHub then shows as closed, not merged. */
export type AppliedByMaintainers = Note & {
  pullRequest: string;
  title: string;
  repo: string;
  /** The day it landed, as YYYY-MM-DD. */
  landed: string;
  commit: Reference;
};

export type Contribution = {
  pullRequest: string;
  title: string;
  project: Project;
  kind: Kind;
  /** The day it landed, as YYYY-MM-DD. */
  landed: string;
  issue?: Reference;
  /** From the start of the pull request description, for a contribution without a note. */
  description?: string;
  commit?: Reference;
} & Note;

export type ContributionSet = {
  /** In display order: within a group by project importance, then newest first. */
  all: Contribution[];
  featured: Contribution[];
  openCount: number;
  projectCount: number;
};

// Projects by importance, which orders the contributions. A project missing here is still shown,
// after these, named after its repository.
const RANKED_PROJECTS: readonly { name: string; repo: string }[] = [
  { name: "Spring Framework", repo: "spring-projects/spring-framework" },
  { name: "Micronaut Core", repo: "micronaut-projects/micronaut-core" },
  { name: "Eclipse Jetty", repo: "jetty/jetty.project" },
  { name: "Apache Commons Lang", repo: "apache/commons-lang" },
  { name: "Apache Log4j 2", repo: "apache/logging-log4j2" },
  { name: "SpotBugs", repo: "spotbugs/spotbugs" },
  { name: "Spring Integration", repo: "spring-projects/spring-integration" },
  { name: "OpenFeign", repo: "OpenFeign/feign" },
  { name: "ArchUnit", repo: "TNG/ArchUnit" },
  { name: "Spring AMQP", repo: "spring-projects/spring-amqp" },
  { name: "Spring Cloud Config", repo: "spring-cloud/spring-cloud-config" },
  { name: "Spring Cloud Stream", repo: "spring-cloud/spring-cloud-stream" },
  { name: "Apache Maven", repo: "apache/maven" },
  { name: "Apache Tomcat", repo: "apache/tomcat" },
  { name: "Apache Dubbo", repo: "apache/dubbo" },
  { name: "Mockito", repo: "mockito/mockito" },
  { name: "Apache Camel", repo: "apache/camel" },
  { name: "Apache Felix", repo: "apache/felix-dev" },
  { name: "Eclipse Yasson", repo: "eclipse-ee4j/yasson" },
  { name: "Eclipse Angus Mail", repo: "eclipse-ee4j/angus-mail" },
  { name: "Eclipse Mojarra", repo: "eclipse-ee4j/mojarra" },
  { name: "Apache WSS4J", repo: "apache/ws-wss4j" },
];

const GITHUB = "https://github.com";

function pullRequestUrl(repo: string, number: number): string {
  return `${GITHUB}/${repo}/pull/${number}`;
}

function jira(key: string): Reference {
  return { label: key, url: `https://issues.apache.org/jira/browse/${key}` };
}

/** The notes, by pull request URL. */
export const NOTES: Record<string, Note> = {
  // Bugs fixed
  [pullRequestUrl("spring-projects/spring-framework", 37543)]: {
    kind: KIND.fix,
    featured: true,
    summary: "ProtobufDecoder releases the buffer of a partly read message when the subscriber cancels, so pooled buffers no longer leak.",
    problem:
      "ProtobufDecoder released the buffer of a partially read message only when the input completed or failed. When a subscriber cancelled while a message was split across data buffers, for example right after receiving the previous message, that buffer was never released. With pooled buffers, such as Netty's, it leaked.",
    fix:
      "The decoder now releases the buffer in doFinally, as the character-sequence decoders already did, so cancellation releases it too. A new test decodes a buffer that holds one message and half of the next, cancels after the first message, and asserts that the leak-aware buffer factory reports no leak. It reports one leak without the change.",
  },
  [pullRequestUrl("micronaut-projects/micronaut-core", 13801)]: {
    kind: KIND.fix,
    featured: true,
    summary: "An Accept-Charset header no longer decides how a String request body is decoded.",
    problem:
      "The String and text/plain body readers decoded the request body with a charset lookup that falls back to the Accept-Charset header when the Content-Type has none. For a request, those are the request's own headers, so Content-Type application/json with Accept-Charset Big5 made a UTF-8 body decode as Big5 and corrupted non-ASCII text. Accept-Charset states a preference for the response, not the encoding of the request body.",
    fix:
      "The readers now use only the charset parameter of the Content-Type, falling back to the configured default charset. Eleven tests cover buffered, streamed and chunked reads with Accept-Charset Big5 and ISO-8859-1, a missing media type, text/plain, and that an explicit Content-Type charset still wins. Nine of them fail on the release branch with the garbled output from the report.",
  },
  [pullRequestUrl("jetty/jetty.project", 15976)]: {
    kind: KIND.fix,
    featured: true,
    summary: "A web application in a directory such as foo.com deploys as one app, together with its properties file.",
    problem:
      "The deployment scanner grouped scanned paths into apps by their basename, which drops everything after the last dot, for directories too. A webapp directory foo.com became the app foo, separate from the app foo.com of foo.com.properties, so the context deployed empty and answered 404. The code meant to strip .d from nominated directories never ran, because the extension check is always false for a directory.",
    fix:
      "A new helper gives the app name of a scanned path: a file keeps its name without extension, a directory keeps its whole name (dropping only a .d suffix), and a path that no longer exists maps to the app that already holds it, so removing foo.com undeploys foo.com. Tests cover directories with dots, nominated directories and the removal case.",
  },
  [pullRequestUrl("spotbugs/spotbugs", 4377)]: {
    kind: KIND.fix,
    featured: true,
    summary: "An ignored Arrays.copyOf result is reported, and so are discarded calls to pure methods of any class that uses assert.",
    problem:
      "Ignoring the result of Arrays.copyOf was never reported, and neither was Arrays.binarySearch, which is on the allow-list. The cause was not the allow-list. java.util.Arrays uses assert, so javac gives it a static initializer that calls Class.desiredAssertionStatus(). That call was taken for a side effect, so every static method of the class was recorded as possibly called only to trigger class initialization, which the checker never reports. The same happened to the pure static methods and constructors of any analysed class containing an assert.",
    fix:
      "Class.desiredAssertionStatus() is now treated as side-effect free, which fixes the root cause. Arrays.copyOf and copyOfRange are also listed explicitly, because copyOfRange throws on an invalid range, which the bytecode analysis takes for a side effect. A reproducer covers both overloads, a user class with assert, and used results.",
  },
  [pullRequestUrl("apache/logging-log4j2", 4400)]: {
    kind: KIND.fix,
    featured: true,
    summary: "Timestamps before 1970 format correctly; truncating division had produced negative nanoseconds and garbage seconds.",
    problem:
      "Found by differential fuzzing against java.time, with no prior report. Splitting a negative epoch millisecond value with a truncating division gave a negative nanosecond-of-second, breaking an invariant every consumer relies on. The per-minute formatter cache was keyed with a truncating division as well and rendered seconds with a truncating remainder, so the wrong cached minute was chosen and a date pattern printed 23:59:+'.000 for a time one minute before the epoch.",
    fix:
      "Both places now use Math.floorDiv and Math.floorMod, which agree with the truncating operators for every instant after the epoch, so nothing changes there. Tests cover seven epoch-millisecond values around the boundary and the formatter's cached-minute path, which the reviewer asked for; reverting the division makes that test fail.",
  },
  [pullRequestUrl("apache/logging-log4j2", 4414)]: {
    kind: KIND.fix,
    summary: "A rewrite policy for com.foo no longer rewrites events from the sibling package com.foobar.",
    problem:
      "The policy matched the configured logger name with startsWith, so a rule for com.foo also matched com.foobar.Baz, which merely shares a character prefix. Every other logger-name feature in Log4j resolves by truncating at dots, and the mismatch silently demoted levels for packages the operator never meant to touch.",
    fix:
      "A match now requires the exact name or a dot-separated descendant. Review found that an empty name (catch-all) and a name ending in a dot had worked before and would have stopped; both are kept working and tested, alongside the sibling, child and exact cases.",
  },
  [pullRequestUrl("apache/commons-lang", 1812)]: {
    kind: KIND.fix,
    featured: true,
    summary: "TypeUtils.containsTypeVariables and unrollVariables honour the owner type of a ParameterizedType, so Outer<T>.Inner resolves.",
    issue: jira("LANG-1836"),
    problem:
      "containsTypeVariables ignored the owner type of a ParameterizedType, so Outer<T>.Inner was reported as containing no type variables, against its own Javadoc. unrollVariables never unrolled the owner, and for Outer<T>.Inner<T> it merged the raw type's own parameters over the caller's map, discarding the caller's T to String. A guard from an earlier fix also stopped a variable that occurs twice from being unrolled everywhere, so Map<T, T> became Map<String, T>.",
    fix:
      "Both methods now recurse into the owner type, unrolling the type arguments against the caller's map and rebuilding the type with its unrolled owner. The guard is released once a variable is resolved, so repeated variables unroll while genuine cycles are still cut; review added identity-based cycle detection through owners and type arguments. A new fixture gives regression tests that fail on master, and the default Maven build, over 85,000 tests with Checkstyle, PMD, SpotBugs and japicmp, passed before each round.",
  },
  [pullRequestUrl("spring-cloud/spring-cloud-config", 3346)]: {
    kind: KIND.fix,
    summary: "With multiple-uri-strategy always, a config server that answers with HTML no longer stops the client at the first URI.",
    issue: { label: "#1723", url: `${GITHUB}/spring-cloud/spring-cloud-config/issues/1723` },
    problem:
      "When a config server answered with a body the client could not read as an Environment, such as the HTML login page of a misconfigured security setup, RestTemplate threw UnknownContentTypeException. That exception stopped the client at the first URI even with the strategy set to always, while a 4xx or 5xx response moved on to the next one.",
    fix:
      "Both the config data loader and the bootstrap property source locator now try the next URI after an unreadable response when the strategy is always, logging it like the other failures. The last URI, and any URI with connection-timeout-only, rethrows as before so fail-fast behaviour is unchanged. Written test first: the new tests failed on main with a fail-fast exception.",
  },
  [pullRequestUrl("OpenFeign/feign", 3605)]: {
    kind: KIND.fix,
    featured: true,
    summary: "A Request built with a null body behaves like one with an empty body instead of throwing on first access.",
    issue: { label: "#1210", url: `${GITHUB}/OpenFeign/feign/issues/1210` },
    problem:
      "Request.create documents that the body can be null, but the constructor stored the null and body(), charset(), isBinary() and length() dereferenced it, so any body-less Request built outside RequestTemplate threw a NullPointerException on first use.",
    fix:
      "The constructor normalises a null body to Body.empty(), the default RequestTemplate already uses, which gives exactly the documented contract so clients that branch on body() != null keep working. toString() checks the body's bytes so a body-less request still prints only the request line and headers. Two tests pin the contract and the changelog has an entry.",
  },
  [pullRequestUrl("apache/felix-dev", 575)]: {
    kind: KIND.fix,
    summary: "An IOException from a URL stream handler reaches the caller as an IOException, not as IllegalStateException with a null message.",
    problem:
      "The URL handler proxy invokes a stream handler from another class loader through reflection. Method.invoke wraps the handler's IOException in an InvocationTargetException, which a generic catch then wrapped in IllegalStateException(\"Stream handler unavailable due to: null\"). A FileNotFoundException from URL.openConnection therefore escaped catch (IOException) blocks.",
    fix:
      "A small helper rethrows the handler's IOException on the four reflective paths, keeping the original type and stack trace. Other invocation failures are handled as before. A test opens a connection through the proxy with a handler that throws FileNotFoundException, with and without a Proxy.",
  },
  [pullRequestUrl("eclipse-ee4j/yasson", 789)]: {
    kind: KIND.fix,
    summary: "An adapter declared with @JsonbTypeAdapter on a class is applied to elements of a raw collection, and the result no longer depends on call order.",
    problem:
      "Serialising List.of(annotated) wrote the element field by field, ignoring its class-level adapter. The element type of a raw collection is Object, so the runtime-type serializer passed the customisation of Object down and never looked at the class customisation of the actual type. The serializer built that way was cached for the class, so a later toJson of the object itself ignored the adapter too.",
    fix:
      "The runtime serializer chain keeps the given customisation only when it binds a serializer or an adapter, and otherwise uses the class customisation of the runtime type. Tests cover the adapter and serializer cases inside a collection and then directly, with a fresh Jsonb.",
  },
  [pullRequestUrl("eclipse-ee4j/yasson", 788)]: {
    kind: KIND.fix,
    summary: "A JSON array bound to a String property fails with a clear error instead of silently binding the last element.",
    problem:
      "Since Yasson 3, {\"test\": [\"a\", \"b\", \"c\"]} bound to a String property gave \"c\". The position checker advanced the parser by one event when the current event was unexpected, a step meant for user deserializers that stop just before a value. At START_ARRAY that step entered the array, so the first element was read as the value and the rest were read as further values for the same property.",
    fix:
      "The checker no longer steps into an array or object that is not expected, and the document is rejected with the existing exception. The skip still applies to every other event, so user-defined deserializers keep working, including the KEY_NAME case the reviewer pointed at.",
  },
  [pullRequestUrl("eclipse-ee4j/yasson", 787)]: {
    kind: KIND.fix,
    summary: "A property annotated with @JsonbTypeSerializer uses the instance registered in JsonbConfig for the same type instead of a new one.",
    problem:
      "The component matcher is documented to reuse a registered instance for the same type, but it compared the class of the binding wrapper with the serializer class, so the check never matched. Every annotated property got a new instance, and a stateful or specially constructed registered instance was ignored.",
    fix:
      "The two checks compare the class of the wrapped serializer or deserializer, as the adapter check already did. A test registers components whose output depends on how they were constructed and checks that annotated properties use them, and still get a new instance when none is registered.",
  },
  [pullRequestUrl("eclipse-ee4j/yasson", 792)]: {
    kind: KIND.fix,
    summary: "When a setter throws during deserialisation, the error names the class and keeps the setter's exception as the cause.",
    problem:
      "The message for a failing setter was built by concatenating the half-deserialised object, which called its toString(). If that failed, for example because a later field was still null, its exception replaced the setter's, and the real cause was lost.",
    fix:
      "The message uses the class name, as the getter path already did after an earlier fix, and keeps the setter's exception as the cause. It also copes with a null instance from a creator method. Two tests deserialise a class whose setter and toString() both throw.",
  },
  [pullRequestUrl("eclipse-ee4j/yasson", 786)]: {
    kind: KIND.fix,
    summary: "A record component annotated with @JsonbDateFormat(TIME_IN_MILLIS) deserialises instead of failing on a reserved character.",
    problem:
      "The creator-parameter path passed the annotation value straight to DateTimeFormatter.ofPattern, including the ##time-in-millis and ##default markers, so records and @JsonbCreator parameters using them failed with \"Pattern includes reserved character: '#'\".",
    fix:
      "The creator path now treats the two markers the way the property path already did, creating a formatter without a pattern so the converters use epoch millis or their defaults. A record test round-trips a TIME_IN_MILLIS Instant, a locale-only LocalDate and a plain Instant.",
  },
  [pullRequestUrl("eclipse-ee4j/angus-mail", 215)]: {
    kind: KIND.fix,
    summary: "SMTP authentication with a long XOAUTH2 token no longer fails with 'line too long'.",
    problem:
      "The initial response of an authentication mechanism was always sent on the AUTH command line. An XOAUTH2 access token of a thousand characters or more, as Google Workspace issues, pushed the line over the 512-octet limit of RFC 5321, and servers answered 500 or 555 'line too long'.",
    fix:
      "As RFC 4954 requires, an initial response that would not fit is sent in reply to the server's first empty 334 challenge, for both the built-in mechanisms and SASL. A response that fits is sent as before. Tests drive a fake server through both paths.",
  },
  [pullRequestUrl("eclipse-ee4j/angus-mail", 216)]: {
    kind: KIND.fix,
    summary: "An IMAP search for a subject with umlauts runs on the server instead of falling back to fetching every message.",
    problem:
      "After enabling UTF8=ACCEPT, the SEARCH command was correctly sent without a CHARSET, but the search text was still written byte-wise as ASCII, keeping only the low byte of each character. The server rejected the invalid UTF-8, and the client fell back to a search on the client that fetched the whole folder, which took minutes on a large mailbox.",
    fix:
      "The search sequence is generated in UTF-8 when no charset is given and UTF-8 has been enabled, with non-ASCII text sent as a quoted string, which RFC 6855 allows. Without UTF-8 support nothing changes. The maintainer's own draft was abandoned in favour of this one after a discussion of the RFC's quoted-string rules.",
  },
  [pullRequestUrl("eclipse-ee4j/angus-mail", 214)]: {
    kind: KIND.fix,
    summary: "A Gmail label such as \\Sent is parsed correctly from every copy of a FETCH response, not corrupted to \\Sentt.",
    problem:
      "Unescaping a quoted string shifted the bytes of the response buffer in place. The buffer is shared by every copy of the response, and several FetchResponse objects are built from the same bytes, so once one had read the string the others saw the shifted bytes and returned a corrupted value.",
    fix:
      "A quoted string with escape characters is unescaped into a new array and the buffer is left unchanged; one without escapes is still returned as a view without copying. Three tests read the string twice, from a copy, and as a ByteArray.",
  },
  // Features added
  [pullRequestUrl("spring-projects/spring-integration", 11535)]: {
    kind: KIND.feature,
    featured: true,
    summary: "The FTP and FTPS session factories connect through a SOCKS or HTTP proxy, with a dedicated factory for HTTP proxies that need credentials.",
    problem:
      "An FTP server behind a proxy could only be reached with the JVM's proxy system properties, which affect every connection of the application, or with a custom session factory. The SFTP factory had proxy support; the FTP one did not. The request had been open since 2012.",
    fix:
      "AbstractFtpSessionFactory gains setProxy(java.net.Proxy) for SOCKS and HTTP CONNECT proxies, failing fast unless the client is in passive mode, since a server cannot connect back through a proxy. A new FtpHttpProxySessionFactory covers HTTP proxies that require credentials. Reference documentation and a What's New entry are included, and the tests did not compile against main before the change.",
  },
  [pullRequestUrl("spring-projects/spring-integration", 11539)]: {
    kind: KIND.feature,
    summary: "DefaultJmsHeaderMapper can keep selected message headers out of the JMS message, with the same patterns it already used inbound.",
    problem:
      "The mapper could restrict which JMS properties were mapped inbound, but outbound it copied every eligible header. Keeping internal headers out of a JMS message needed a HeaderFilter in front of every JMS endpoint.",
    fix:
      "setOutboundHeaderNames takes the same simple wildcard and negation patterns as the inbound side; the first match decides, the default is everything, and the JMS API headers are always mapped. Documented in the JMS chapter and the What's New page.",
  },
  [pullRequestUrl("spring-projects/spring-amqp", 3728)]: {
    kind: KIND.feature,
    summary: "AmqpAdmin declares several exchanges, queues or bindings on a single channel in one call.",
    problem:
      "RabbitAdmin already declared the context's exchanges, queues and bindings on one channel internally, but the programmatic API exposed one object per call, each on its own channel. The request had been open since 2018, with the maintainer open to it provided the exception handling was thought through.",
    fix:
      "declareExchanges, declareQueues and declareBindings are default methods on AmqpAdmin that declare one by one, so other implementations keep working, and RabbitAdmin overrides them to use a single channel. Each object follows the existing per-declaration exception handling, including ignoreDeclarationExceptions and DeclarationExceptionEvent, and manual declarables are recorded as for single declarations.",
  },
  [pullRequestUrl("TNG/ArchUnit", 1747)]: {
    kind: KIND.feature,
    summary: "A new condition that checks final fields but skips compiler-generated ones, such as the Eclipse compiler's switch tables.",
    issue: { label: "#1313", url: `${GITHUB}/TNG/ArchUnit/issues/1313` },
    problem:
      "Some compilers create non-final synthetic fields, for example a $SWITCH_TABLE$ field for every switch over an enum. haveOnlyFinalFields() reported them as violations although they appear nowhere in the source and cannot be declared final.",
    fix:
      "After discussing with the maintainer whether to change the existing condition, it was kept exactly as it is and an explicit alternative, haveOnlyFinalNonSyntheticFields(), was added and linked from its Javadoc. Because javac never emits such a field, the regression test generates a class file with ASM and imports it.",
  },
  // Documentation
  [pullRequestUrl("apache/maven", 13498)]: {
    kind: KIND.docs,
    summary: "The constructor that takes only a MavenSession documents which expressions it can evaluate.",
    problem:
      "An evaluator created with only a MavenSession failed with a NullPointerException for every expression, even ${project} or ${session}, because evaluation started by reading the mojo descriptor. The issue, MNG-6982, was reported against Maven 3.6.3.",
    fix:
      "The pull request proposed looking up the mojo descriptor only when there is a mojo execution, with a test that failed on master. A maintainer fixed the same code on master while it was under review, so the duplicate test and null check were removed and the Javadoc of the session-only constructor, which now explains the behaviour, is what landed.",
  },
  [pullRequestUrl("spring-cloud/spring-cloud-config", 3347)]: {
    kind: KIND.docs,
    summary: "The reference documentation says where foo-dev.yml ranks against application-dev.yml, foo.yml and application.yml.",
    problem:
      "The Environment Repository page explained precedence in general terms but not where a file named after both the application and a profile ranked, which the issue asked and users were relying on without knowing whether it was supported.",
    fix:
      "An ordered list for the page's sample client, from highest to lowest precedence, scoped to the native, Git and SVN backends. A test with the six files in one location asserts the order of the property sources, so the documentation is pinned to the behaviour.",
  },
  [pullRequestUrl("eclipse-ee4j/angus-mail", 221)]: {
    kind: KIND.docs,
    summary: "The FAQ explains the error that appears when a plain-text connection is made to a port that expects SSL.",
    problem:
      "The error 'Got bad greeting from SMTP host ... response: [EOF]' usually means the server closed the connection before greeting, because port 465 expects SSL from the start, and the FAQ did not cover it.",
    fix: "A FAQ entry after the STARTTLS one explains the cause, gives the properties to set for SSL, and the alternative of a STARTTLS port.",
  },
  // Tests and build
  [pullRequestUrl("apache/tomcat", 1094)]: {
    kind: KIND.tests,
    summary: "Four tests that had never run now run, and the three of them that were wrong are fixed.",
    problem:
      "Four test methods had no @Test annotation, so they never ran. Once they did, each failed: two asserted null where the code returns String.class, one shared a log filter with another test and tripped on a record without a throwable, and one reopened a user database before the file writer was closed and overwrote a file shared with other tests.",
    fix:
      "Each test is fixed to assert what the code does, with its own log filter or its own temporary file. The log validation filter no longer fails on a record without a throwable.",
  },
  [pullRequestUrl("apache/dubbo", 16527)]: {
    kind: KIND.tests,
    summary: "Three test methods lost in the JUnit 5 upgrade run again.",
    problem:
      "ParametersTest extended JUnit 3's TestCase until the JUnit 5 upgrade removed that without adding @Test, so the class had had no running test since. A third method in RegistryConfigTest lacked the annotation its twin had.",
    fix: "@Test added to the three methods, which pass.",
  },
  [pullRequestUrl("mockito/mockito", 3890)]: {
    kind: KIND.tests,
    summary: "A varargs matcher test ignored since Mockito 2 runs again as a regression test.",
    problem:
      "The test was ignored with 'Fails due to #1593'. That issue was closed in Mockito 5, where any(String.class) matches exactly one value passed to a varargs parameter, so the test had been passing silently ignored.",
    fix: "The @Ignore is removed and the test is kept as the regression test for that behaviour.",
  },
  [pullRequestUrl("apache/camel", 28129)]: {
    kind: KIND.tests,
    summary: "A CXF failover test disabled for a CXF bug runs again now that Camel uses a fixed CXF.",
    problem:
      "The test was disabled when an Undertow upgrade exposed a NullPointerException in CXF's failover, tracked as CXF-9204. That was fixed in CXF 4.2.1 and Camel was on 4.2.4, but the test stayed disabled.",
    fix: "The @Disabled is removed; the test passed seven runs out of seven locally and in CI.",
  },
  [pullRequestUrl("apache/logging-log4j2", 4413)]: {
    kind: KIND.tests,
    summary: "A rolling appender test ignored as flaky on 2.x runs again, without its 15-second sleep.",
    problem:
      "The test had been ignored on 2.x since it was found flaky. The fix on main replaced the sleeps between log events with a rollover listener and a latch, but was never ported to 2.x.",
    fix:
      "The approach from main is ported to the JUnit 4 test on 2.x: it registers as a rollover listener, logs without sleeping and waits for the rollovers, with fixed-size payloads so the count is deterministic.",
  },
  [pullRequestUrl("apache/commons-lang", 1830)]: {
    kind: KIND.tests,
    summary: "Three tests that never matched the Surefire pattern run now.",
    problem: "The test class name did not end in Test, so it never matched the Surefire include pattern and its three tests had never run.",
    fix: "The class is renamed; its tests run and pass. A weakness in one assertion was noted on the pull request and left for a separate change.",
  },
  [pullRequestUrl("eclipse-ee4j/mojarra", 6066)]: {
    kind: KIND.tests,
    summary: "The regression test for an old attached-state bug runs again after the JUnit 5 migration.",
    problem:
      "The JUnit 5 migration added @Test to six methods of the class but missed the seventh, which sits under a @SuppressWarnings annotation. It is the regression test for restoring saved attached state twice.",
    fix: "@Test added; the class runs seven tests instead of six.",
  },
  [pullRequestUrl("apache/felix-dev", 578)]: {
    kind: KIND.tests,
    summary: "The test for a service registered as three hooks at once runs again.",
    problem: "The only method of the class without @Test ran under JUnit 3 because of its name, but JUnit 5 never ran it.",
    fix: "@Test added and the method named like its siblings; the class runs 38 tests instead of 37.",
  },
  [pullRequestUrl("apache/ws-wss4j", 761)]: {
    kind: KIND.tests,
    summary: "Nine derived-key tests that never matched the Surefire pattern run now.",
    problem: "The build includes only classes ending in Test; this one ended in Tests, unlike its 35 siblings, so its nine tests had never run.",
    fix: "The class is renamed; all nine tests pass and the module's test count goes from 189 to 198.",
  },
  [pullRequestUrl("spring-projects/spring-amqp", 3729)]: {
    kind: KIND.tests,
    summary: "The documented command for building the reference documentation locally works again.",
    problem:
      "The Gradle task passed its options as strings, which the Antora plugin turned into three extra arguments, and the Node plugin it pulled in broke Gradle's configuration cache by starting a process during configuration.",
    fix: "The options are booleans, so they become flags, and a newer Node Gradle plugin that supports the configuration cache is declared. A second run reuses the cache.",
  },
};

/** Changes that landed as a maintainer's commit rather than a merge, which GitHub's merged list cannot show. */
export const APPLIED_BY_MAINTAINERS: AppliedByMaintainers[] = [
  {
    pullRequest: pullRequestUrl("spring-cloud/spring-cloud-stream", 3296),
    title: "Do not start running binder contexts from DefaultBinderFactory",
    repo: "spring-cloud/spring-cloud-stream",
    landed: "2026-10-09",
    commit: { label: "commit 124562e", url: `${GITHUB}/spring-cloud/spring-cloud-stream/commit/124562eba5ce8c84fd9bdfd01176cbca8409da17` },
    kind: KIND.fix,
    issue: { label: "gh-3155", url: `${GITHUB}/spring-cloud/spring-cloud-stream/issues/3155` },
    summary: "DefaultBinderFactory no longer starts plain lifecycle beans in binder contexts during a normal refresh.",
    problem:
      "DefaultBinderFactory became a SmartLifecycle so that a CRaC checkpoint can stop the binder child contexts and a restore can start them again. Its start() also ran on the regular refresh, after the binder contexts were already running, and start() on a running context starts every Lifecycle bean, including the plain ones a refresh deliberately leaves alone, such as the header channel registry and its reaper task.",
    fix:
      "start() now starts only binder contexts that are not running, that is the ones stopped for a checkpoint. A freshly refreshed context is left alone, so auto-startup beans behave as before and plain Lifecycle beans are no longer started. One test fails on main and passes with the change; another guards the stop-and-restart path. The maintainers rebased it onto main as their own commit with the authorship kept, which is why GitHub shows the pull request as closed, and backported it to 5.0.x.",
  },
];

export const KIND_COPY: Record<Kind, { title: string; intro: string }> = {
  [KIND.fix]: {
    title: "Bugs fixed",
    intro: "Each one was reproduced with a test that fails on the base branch and passes with the fix.",
  },
  [KIND.feature]: {
    title: "Features added",
    intro: "Requests that had been open for years, built test-first with reference documentation.",
  },
  [KIND.docs]: {
    title: "Documentation",
    intro: "Behaviour that was undocumented, pinned by a test where there was none.",
  },
  [KIND.tests]: {
    title: "Tests and build",
    intro: "Tests that had silently stopped running, found across many projects, made to run again. Where a test then failed, it was fixed.",
  },
};

/** The groups on /open-source, in display order. */
export const KIND_ORDER: readonly Kind[] = [KIND.fix, KIND.feature, KIND.docs, KIND.tests];

const TEST_TITLE = /\b(test|@Test|Surefire|@Ignore|@Disabled|flaky)\b/i;
const DOCS_TITLE = /\b(document|documentation|javadoc|FAQ|docs?)\b/i;
const FEATURE_TITLE = /^(add|support|introduce|allow|expose|provide)\b/i;

/** A guess from the title, for a pull request without a note. */
export function inferKind(title: string): Kind {
  if (TEST_TITLE.test(title)) return KIND.tests;
  if (DOCS_TITLE.test(title)) return KIND.docs;
  if (FEATURE_TITLE.test(title)) return KIND.feature;
  return KIND.fix;
}

const CLOSES_ISSUE = /\b(?:fix(?:es)?|closes?|resolves?)\s+(?:#|gh-)(\d+)/i;
const JIRA_ISSUE = /https:\/\/issues\.apache\.org\/jira\/browse\/([A-Z][A-Z0-9]+-\d+)/;

/** The issue a pull request says it closes, read from its description. */
export function inferIssue(body: string, repo: string): Reference | undefined {
  const github = CLOSES_ISSUE.exec(body);
  if (github) return { label: `#${github[1]}`, url: `${GITHUB}/${repo}/issues/${github[1]}` };
  const apache = JIRA_ISSUE.exec(body);
  if (apache) return jira(apache[1]);
  return undefined;
}

const DESCRIPTION_LIMIT = 400;
const SKIPPED_LINE = /^\s*(#|-\s*\[|\*\s*\[|<!--|fix(es)?\s|closes?\s|resolves?\s|see\s|\|)/i;

/** The first real paragraph of a pull request description, without markdown furniture, for a contribution with no note. */
export function descriptionFrom(body: string): string | undefined {
  const paragraphs = body.replace(/\r/g, "").split(/\n\s*\n/);
  const first = paragraphs.map((paragraph) => paragraph.trim()).find((paragraph) => paragraph && !SKIPPED_LINE.test(paragraph));
  if (!first) return undefined;
  const text = first.replace(/\s*\n\s*/g, " ").replace(/`/g, "");
  return text.length > DESCRIPTION_LIMIT ? `${text.slice(0, DESCRIPTION_LIMIT).trimEnd()}…` : text;
}

function projectFor(repo: string): Project {
  const ranked = RANKED_PROJECTS.find((project) => project.repo === repo);
  return { name: ranked?.name ?? repo.split("/")[1], repo, url: `${GITHUB}/${repo}` };
}

function rankOf(repo: string): number {
  const index = RANKED_PROJECTS.findIndex((project) => project.repo === repo);
  return index === -1 ? RANKED_PROJECTS.length : index;
}

function fromFacts(facts: PullRequestFacts): Contribution {
  const note = NOTES[facts.url] ?? {};
  return {
    ...note,
    pullRequest: facts.url,
    title: facts.title,
    project: projectFor(facts.repo),
    kind: note.kind ?? inferKind(facts.title),
    landed: (facts.mergedAt ?? "").slice(0, 10),
    issue: note.issue ?? inferIssue(facts.body, facts.repo),
    description: note.problem ? undefined : descriptionFrom(facts.body),
  };
}

function fromApplied(applied: AppliedByMaintainers): Contribution {
  const { pullRequest, title, repo, landed, commit, ...note } = applied;
  return { ...note, pullRequest, title, project: projectFor(repo), kind: note.kind ?? inferKind(title), landed, commit };
}

function byImportance(a: Contribution, b: Contribution): number {
  return (
    KIND_ORDER.indexOf(a.kind) - KIND_ORDER.indexOf(b.kind) ||
    rankOf(a.project.repo) - rankOf(b.project.repo) ||
    b.landed.localeCompare(a.landed) ||
    a.pullRequest.localeCompare(b.pullRequest)
  );
}

/** Joins what GitHub says with what is written here. */
export function buildContributions(pullRequests: PullRequests): ContributionSet {
  const all = [...pullRequests.merged.map(fromFacts), ...APPLIED_BY_MAINTAINERS.map(fromApplied)].toSorted(byImportance);
  const featured = all.filter((contribution) => contribution.featured);
  const projectCount = new Set(all.map((contribution) => contribution.project.repo)).size;
  return { all, featured, openCount: pullRequests.openCount, projectCount };
}

export function ofKind(set: ContributionSet, kind: Kind): Contribution[] {
  return set.all.filter((contribution) => contribution.kind === kind);
}
