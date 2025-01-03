import Image from "next/image";
import NextLink from "next/link";
import { MDXRemote, MDXRemoteProps } from "next-mdx-remote/rsc";
import { ComponentProps } from "react";
import React from "react";
import { FaCircleInfo, FaCircleXmark, FaLightbulb, FaTriangleExclamation } from "react-icons/fa6";
import rehypeKatex from "rehype-katex";
import remarkMath from "remark-math";
import { highlight } from "sugar-high";

import { slugify } from "@/lib/content";

type LinkProps = ComponentProps<typeof NextLink> & {
  href: string;
  children: React.ReactNode;
};

type ImageProps = ComponentProps<typeof Image>;

type TableProps = {
  data: { headers: string[]; rows: string[][] };
};

type CodeProps = ComponentProps<"code"> & {
  children: string;
};

type CalloutProps = {
  children: React.ReactNode;
  type?: "note" | "warning" | "error";
};

function Callout({ children, type = "note" }: CalloutProps) {
  const typeToIcon = {
    note: <FaCircleInfo className="text-theme-200" size={18} />,
    tip: <FaLightbulb className="text-theme-200" size={18} />,
    warning: <FaTriangleExclamation className="text-theme-200" size={18} />,
    error: <FaCircleXmark className="text-theme-200" size={18} />,
  };

  return (
    <div className="my-6 flex gap-2 rounded-lg border border-theme-400 dark:border-theme-700 bg-theme-200 dark:bg-theme-800 p-4">
      <div className="select-none text-xl">{typeToIcon[type]}</div>
      <div className="w-full text-theme-900 dark:text-theme-100 [&>p]:mt-0">{children}</div>
    </div>
  );
}

function BlockQuote({ children }: { children: React.ReactNode }) {
  const content = React.Children.toArray(children);
  const firstChild = content[1];

  if (React.isValidElement(firstChild)) {
    const childContent = firstChild.props?.children;
    // Check if the first part is a string that starts with [!
    const firstPart = Array.isArray(childContent) ? childContent[0] : childContent;

    if (typeof firstPart === "string" && firstPart.startsWith("[!")) {
      const match = firstPart.match(/\[!(.*?)\]/);
      if (match) {
        const type = match[1].toLowerCase();
        // Remove the [!TYPE] prefix from only the first string
        const cleanContent = content
          .filter((child, i) => i > 0)
          .map((child, i) => {
            if (i === 0 && React.isValidElement(child)) {
              const newChildren = Array.isArray(child.props.children)
                ? [
                    child.props.children[0].replace(/\[!.*?\]\s*/, ""),
                    ...child.props.children.slice(1),
                  ]
                : child.props.children.replace(/\[!.*?\]\s*/, "");

              return React.cloneElement(child, {
                ...child.props,
                children: newChildren,
              });
            }
            return child;
          });

        return <Callout type={type as "note" | "warning" | "error"}>{cleanContent}</Callout>;
      }
    }
  }

  return (
    <blockquote className="p-4 my-6 border-l-4 border-theme-400 dark:border-theme-700 pl-4 italic bg-theme-200 dark:bg-theme-800">
      {children}
    </blockquote>
  );
}

function Table({ data }: TableProps): React.JSX.Element {
  const headers = data.headers.map((header, index) => <th key={index}>{header}</th>);
  const rows = data.rows.map((row, index) => (
    <tr key={index}>
      {row.map((cell, cellIndex) => (
        <td key={cellIndex}>{cell}</td>
      ))}
    </tr>
  ));

  return (
    <table>
      <thead>
        <tr>{headers}</tr>
      </thead>
      <tbody>{rows}</tbody>
    </table>
  );
}

function Link(props: LinkProps): React.JSX.Element {
  const href = props.href;

  if (href.startsWith("/")) {
    return <NextLink {...props}>{props.children}</NextLink>;
  }

  if (href.startsWith("#")) {
    return <a {...props} />;
  }

  return <a target="_blank" rel="noopener noreferrer" {...props} />;
}

function RoundedImage(props: ImageProps) {
  return <Image className="rounded-lg" {...props} alt={props.alt} />;
}

function Code({ children, ...props }: CodeProps) {
  // Check if this is a code block (inside pre) or inline code
  const isInline = !props.className?.includes("language-");
  if (isInline) {
    // For inline code, use simpler styling without syntax highlighting
    return <code {...props}>{children}</code>;
  }
  // For code blocks, use sugar-high syntax highlighting
  const codeHTML = highlight(children);
  return <code dangerouslySetInnerHTML={{ __html: codeHTML }} {...props} />;
}

function createHeading(level: number) {
  const Heading = ({ children }) => {
    const slug = slugify(children);
    return React.createElement(
      `h${level}`,
      { id: slug },
      [
        React.createElement("a", {
          href: `#${slug}`,
          key: `link-${slug}`,
          className: "anchor",
        }),
      ],
      children
    );
  };

  Heading.displayName = `Heading${level}`;

  return Heading;
}

const customComponents = {
  h1: createHeading(1),
  h2: createHeading(2),
  h3: createHeading(3),
  h4: createHeading(4),
  h5: createHeading(5),
  h6: createHeading(6),
  Image: RoundedImage,
  a: Link,
  code: Code,
  Table,
  blockquote: BlockQuote,
};

export function MDX({ source, components, options }: MDXRemoteProps) {
  return (
    <MDXRemote
      source={source}
      options={{
        mdxOptions: {
          remarkPlugins: [remarkMath],
          rehypePlugins: [rehypeKatex],
        },
        ...options,
      }}
      components={{
        ...customComponents,
        ...(components || {}),
      }}
    />
  );
}
