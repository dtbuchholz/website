import { Projects } from "@/components/projects";

export const metadata = {
  title: "Projects",
  description: "Various tools or libraries I've built.",
};

export default function Page(): React.ReactNode {
  return (
    <section>
      <h1 className="font-extrabold text-2xl mb-8 tracking-tighter">Projects</h1>
      <Projects />
    </section>
  );
}
