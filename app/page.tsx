import { BlogPosts } from "app/components/posts";
import dynamic from "next/dynamic";

const Terminal = dynamic(() => import("app/components/terminal"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] w-full rounded-lg overflow-hidden border border-neutral-200 dark:border-neutral-800 bg-black" />
  ),
});

export default function Page() {
  return (
    <section>
      <Terminal />
      <hr className="my-8" />
      <h2 className="mb-8 text-2xl font-semibold tracking-tighter">Recent posts</h2>
      <div className="my-8">
        <BlogPosts count={2} />
      </div>
    </section>
  );
}
