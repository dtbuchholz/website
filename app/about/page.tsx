import NextLink from "next/link";

type TimelineEvent = {
  year: string;
  title: React.ReactNode;
  content: React.ReactNode;
};

const headerInfo = {
  title: "Hi, I'm Dan.",
  content: [
    <>
      I&apos;m a software engineer building decentralized and distributed systems. Occasionally, I
      write about various things I&apos;m trying to learn or test my understanding of areas
      I&apos;ve worked in. You can dive into my <NextLink href="/blog">posts</NextLink> if
      you&apos;re curious.
    </>,
    <>
      I&apos;ve spent the past few years working on blockchain systems, starting with Ethereum
      consensus clients and now, mostly, storage systems. Other obsessions include space, physics,
      and artificial intelligence. Born and raised in Chicago, I moved to San Francisco to get
      involved in another early stage startup, prior to more recently moving to New York City. Below
      are some of the things I&apos;ve worked on over the years.
    </>,
  ],
};

const timelineEvents: TimelineEvent[] = [
  {
    year: "2022-Present",
    title: "Building decentralized storage systems",
    content: (
      <>
        I&apos;ve been focused on both growth and engineering at{" "}
        <NextLink href="https://linktr.ee/textileio" target="_blank" rel="noreferrer">
          Textile
        </NextLink>
        . We build web3 native storage solutions. This started with{" "}
        <NextLink href="https://docs.tableland.xyz" target="_blank" rel="noreferrer">
          Tableland
        </NextLink>
        , which is a decentralized SQLite database that gives you a way to write SQL onchain (smart
        contracts), materialized by an offchain network of validators.
        <br />
        <br />
        Now, I&apos;m primarily focused on building a data storage L2 chain called{" "}
        <NextLink href="https://basin.textile.io/" target="_blank" rel="noreferrer">
          Basin
        </NextLink>
        . Think of it as a hot data layer for decentralized applications with mix across S3 and
        Cloudflare functionality. Fast finality, large scale data (GiBs per transaction)—all
        programmable onchain within horizontally scalable subnets and custom consensus. A lot of
        Rust, Solidity (hand rolling CBOR encoding/decoding...), and SDKs in JS/TS. horizontally
        scalable subnets and custom consensus. A lot of Rust, Solidity (hand rolling CBOR
        encoding/decoding...), and SDKs in JS/TS.
      </>
    ),
  },
  {
    year: "2021",
    title: "Fellow at Ethereum Foundation",
    content: (
      <>
        I spent ~6 months as a Core Developer (funded by the{" "}
        <NextLink href="https://ethereum.foundation/" target="_blank" rel="noreferrer">
          EF
        </NextLink>
        ) where I contributed to an Ethereum research team&apos;s codebase, focused on consensus
        clients and proof-of-stake called{" "}
        <code>
          <NextLink
            href="https://github.com/ralexstokes/ethereum-consensus"
            target="_blank"
            rel="noreferrer"
          >
            ethereum-consensus
          </NextLink>
        </code>
        , written in Rust. Around the same time, I was building small apps that interacted with
        onchain mechanisms or external APIs, like reading price data off of CEXs or general prices
        APIs—albeit, these were extremely rudimentary.
      </>
    ),
  },
  {
    year: "2016-2020",
    title: "Solutions engineering in IoT logistics",
    content: (
      <>
        A logistics SaaS startup called{" "}
        <NextLink href="https://www.fourkites.com" target="_blank" rel="noreferrer">
          FourKites
        </NextLink>{" "}
        hired me in operations, but I quickly moved into sales engineering. We built a platform for
        IoT device tracking, providing machine learning predictions through integrations with
        various hardware vendors and global shipment data aggregation. I joined right after the
        Series A when we were a small team of ~20. By the time I left, we were around 500 people,
        Series D, and some acquisitions of adjacent tech that was integrated into our platform.
      </>
    ),
  },
  {
    year: "2015",
    title: "Systems engineering at UIUC",
    content: (
      <>
        I graduated from the{" "}
        <NextLink
          href="https://en.wikipedia.org/wiki/University_of_Illinois_Urbana-Champaign"
          target="_blank"
          rel="noreferrer"
        >
          University of Illinois at Urbana-Champaign
        </NextLink>{" "}
        with a B.S. in Systems Engineering and (nearly) a minor in Electrical Engineering. I
        didn&apos;t study computer science (aside from an intro to C course), but over the years,
        I&apos;ve taught myself the fundamentals through self-study and working on side projects.
      </>
    ),
  },
];

const Timeline = ({ events }: { events: TimelineEvent[] }) => (
  <div className="relative border-l-2 border-theme-200 dark:border-theme-800 pl-8 ml-4">
    {events.map((event) => (
      <div key={event.year} className="mb-12">
        <div className="absolute w-3 h-3 bg-theme-200 dark:bg-theme-800 rounded-full -left-[7px] font-semibold"></div>
        <time className="text-sm text-theme-600 dark:text-theme-300">{event.year}</time>
        <h3 className="font-medium mt-2">{event.title}</h3>
        <p className="mt-2">{event.content}</p>
      </div>
    ))}
  </div>
);

export default function Page(): React.ReactNode {
  return (
    <section className="prose">
      <h1 className="mb-8 text-2xl font-extrabold tracking-tighter">{headerInfo.title}</h1>
      {headerInfo.content.map((content, index) => (
        <p key={index} className="mb-4">
          {content}
        </p>
      ))}

      <hr className="my-8" />

      <Timeline events={timelineEvents} />
    </section>
  );
}
