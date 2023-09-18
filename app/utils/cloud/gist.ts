import { STORAGE_KEY, REPO_URL } from "@/app/constant";
import { SyncStore } from "@/app/store/sync";
import { corsFetch } from "../cors";

export type GistConfig = SyncStore["githubGist"] & { gistId: string };
export type GistClient = ReturnType<typeof createGistClient>;

export function createGistClient(store: SyncStore) {
  let gistId = store.githubGist.gistId;
  const token = store.githubGist.token;
  const fileBackup = store.githubGist.filename;
  const currentDate = new Date().toLocaleString("en-US", {
    timeZone: "UTC",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  // a proxy disable for a tmp since github doesn't need proxy url
  const proxyUrl =
    store.useProxy && store.proxyUrl.length > 0 ? store.proxyUrl : undefined;

  return {
    async create(content: string) {
      const description = `[200 OK] [GithubSync] Last Sync: ${currentDate} Site: ${REPO_URL}`;

      return corsFetch("https://api.github.com/gists", {
        method: "POST",
        headers: this.headers(),
        body: JSON.stringify({
          public: false,
          description,
          files: {
            [fileBackup]: {
              content,
            },
          },
        }),
      })
        .then((res) => {
          console.log("[Gist] create", res.status, res.statusText);
          if (res.status === 201) {
            return res.json().then((data) => {
              gistId = data.id; // Update the gistId with the new Gist ID
              return gistId;
            });
          }
          return null;
        })
        .catch((error) => {
          console.error("[Gist] create", error);
          return null;
        });
    },

    async check(): Promise<string> {
      const res = await corsFetch(this.path(gistId), {
        method: "GET",
        headers: this.headers(),
      });

      console.log("[Gist] check", res.status, res.statusText);

      if (res.status === 200) {
        const data = await res.json();
        return data.files[fileBackup]?.content ?? "";
      } else if (res.status === 404) {
        // If the Gist file doesn't exist, create a new file inside the current Gist
        const newContent = await this.set({});
        return newContent;
      }

      return "";
    },

    async get() {
      const res = await corsFetch(this.path(gistId), {
        method: "GET",
        headers: this.headers(),
      });

      console.log("[Gist] get", res.status, res.statusText);

      if (res.status === 200) {
        const data = await res.json();
        return data.files[fileBackup]?.content ?? "";
      }

      return "";
    },

    async set(data: object) {
      const existingContent = await this.check();
      const newContent = JSON.stringify(data, null, 2);
      const description = `[Sync] [200 OK] [GithubGist] Last Sync: ${currentDate} Site: ${REPO_URL}`;

      return corsFetch(this.path(gistId), {
        method: existingContent ? "PATCH" : "POST",
        headers: this.headers(),
        body: JSON.stringify({
          description,
          files: {
            [fileBackup]: {
              content: newContent,
            },
          },
        }),
      })
        .then((res) => {
          console.log("[Gist] set", res.status, res.statusText);
          return newContent;
        })
        .catch((error) => {
          console.error("[Gist] set", error);
          return "";
        });
    },

    headers() {
      return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      };
    },

    path(gistId: string) {
      return `https://api.github.com/gists/${gistId}`;
    },
  };
}
