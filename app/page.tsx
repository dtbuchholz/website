import type { JSX } from "react";
import { BlogPosts } from "@/components/posts";

export default function Page(): JSX.Element {
  return (
    <section>
      <h2 className="mb-8 text-2xl font-semibold tracking-tighter">Recent posts</h2>
      <div className="my-8">
        <BlogPosts count={2} />
      </div>
    </section>
  );
}
