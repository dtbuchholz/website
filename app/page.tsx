import { BlogPosts } from "app/components/posts";

export default function Page() {
  return (
    <section>
      <hr />
      <h2 className="mb-8 text-2xl font-semibold tracking-tighter">Recent posts</h2>
      <div className="my-8">
        <BlogPosts />
      </div>
    </section>
  );
}
