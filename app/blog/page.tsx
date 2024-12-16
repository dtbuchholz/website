import { BlogPosts } from "app/components/posts";

export const metadata = {
  title: "Writing",
  description: "A collection of posts about programming, research, and more.",
};

export default function Page(): React.ReactNode {
  return (
    <section>
      <h1 className="font-semibold text-2xl mb-8 tracking-tighter">Writing</h1>
      <BlogPosts />
    </section>
  );
}
