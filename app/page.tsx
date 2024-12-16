import { BlogPosts } from "app/components/posts";
import NextLink from "next/link";

export default function Page() {
  return (
    <section>
      <h1 className="mb-8 text-2xl font-semibold tracking-tighter">Hi, I'm Dan.</h1>
      <p className="mb-4">
        I'm a software engineer building decentralized and distributed systems. Occasionally, I
        write about various things I'm trying to learn or test my understanding of areas I've worked
        in. Read more about me <NextLink href="/about">here</NextLink>, or dive into my{" "}
        <NextLink href="/blog">posts</NextLink> below.
      </p>
      <hr />
      <h2 className="mb-8 text-2xl font-semibold tracking-tighter">Recent posts</h2>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  );
}
