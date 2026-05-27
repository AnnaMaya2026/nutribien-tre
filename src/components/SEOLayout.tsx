import { ReactNode } from "react";
import PageSEO from "@/components/PageSEO";

interface SEOLayoutProps {
  title: string;
  description: string;
  path: string;
  children: ReactNode;
}

export default function SEOLayout({ title, description, path, children }: SEOLayoutProps) {
  return (
    <>
      <PageSEO title={title} description={description} path={path} />
      <main id="main-content">{children}</main>
    </>
  );
}
