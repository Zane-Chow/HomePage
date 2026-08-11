export interface InfraService {
  icon: string;
  nameKey: string;
  descKey: string;
}

export const infraServices: InfraService[] = [
  { icon: "ph-git-branch", nameKey: "infra.gitea.name", descKey: "infra.gitea.desc" },
  { icon: "ph-envelope-simple", nameKey: "infra.mailcow.name", descKey: "infra.mailcow.desc" },
  { icon: "ph-heartbeat", nameKey: "infra.uptime.name", descKey: "infra.uptime.desc" },
  { icon: "ph-folder-open", nameKey: "infra.alist.name", descKey: "infra.alist.desc" },
];

export const infraFallback = {
  serverCount: 38,
  regionCount: 19,
};
