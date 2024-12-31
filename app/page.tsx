import dynamic from "next/dynamic";
import type { JSX } from "react";
import { LoadingSpinner } from "@/components/loading";
import { BlogPosts } from "@/components/posts";

const Terminal = dynamic(() => import("app/components/terminal/index"), {
  ssr: false,
  loading: () => {
    return (
      <div className="relative h-[400px] w-full rounded-lg overflow-hidden border border-neutral-800">
        <div className="absolute inset-0 flex items-center justify-center bg-neutral-800">
          <LoadingSpinner />
        </div>
      </div>
    );
  },
});

export default function Page(): JSX.Element {
  return (
    <section>
      <div className="mx-auto max-w-3xl w-full">
        <Terminal />
      </div>

      <hr className="my-8" />
      <h2 className="mb-8 text-2xl font-semibold tracking-tighter">Recent posts</h2>
      <div className="my-8">
        <BlogPosts count={2} />
      </div>
    </section>
  );
}
