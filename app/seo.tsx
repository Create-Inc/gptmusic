import Head from "next/head";

export const Seo = () => (
  <Head>
    {/* Primary meta tags */}
    <title>MusicGPT</title>
    <meta name="title" content="MusicGPT" key="title" />
    <meta
      name="description"
      content="piano music that never ends and never repeats"
      key="description"
    />

    {/* OpenGraph meta tags */}
    <meta property="og:type" content="website" key="og:type" />
    <meta property="og:title" content="MusicGPT" key="og:title" />
    <meta property="og:site_name" content="MusicGPT" />
    <meta
      property="og:description"
      content="piano music that never ends and never repeats"
      key="og:description"
    />
    <meta
      property="og:image"
      content="https://musicgpt.dev/og.png"
      key="og:image"
    />

    {/* Twitter meta tags */}
    <meta
      property="twitter:card"
      content="summary_large_image"
      key="twitter:card"
    />
    <meta property="twitter:title" content="MusicGPT" key="twitter:title" />
    <meta
      property="twitter:description"
      content="piano music that never ends and never repeats"
      key="twitter:description"
    />
    <meta
      property="twitter:image"
      content="https://musicgpt.dev/og.png"
      key="twitter:image"
    />

    <link rel="shortcut icon" href="/favicon.ico" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
  </Head>
);
