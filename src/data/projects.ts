export interface Project {
  id: string;
  titleKey: string;
  descKey: string;
  detailKey?: string;
  stack: string[];
  repoUrl: string;
  featured?: boolean;
  image?: string;
}

export const projects: Project[] = [
  {
    id: "authrouter",
    titleKey: "projects.authrouter.title",
    descKey: "projects.authrouter.desc",
    detailKey: "projects.authrouter.detail",
    stack: ["Go", "OAuth2", "Reverse Proxy"],
    repoUrl: "https://github.com/YIYI-16/AuthRouter",
    featured: true,
    image: "/images/authrouter.png",
  },
];
