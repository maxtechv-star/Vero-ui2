const axios = require("axios");
const cheerio = require("cheerio");

class Kurama {
  constructor() {
    this.u = "https://v8.kuramanime.tel";
    this.targetEnv = "data-kk";
    this.is = axios.create({
      baseURL: this.u,
      headers: {
        "user-agent":
          "Mozilla/5.0 (Linux; Android 16; NX729J) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/143.0.7499.34 Mobile Safari/537.36",
        origin: this.u,
        referer: this.u,
      },
    });
  }

  // Helper buat aman ambil next page
  _parseNextPage(nextPageUrl) {
    if (!nextPageUrl) return null;
    const parts = String(nextPageUrl).split("page=");
    return parts[1] || null;
  }

  async search(query, page = 1, order_by = "latest") {
    try {
      const f = await this.is
        .get(`/anime`, {
          params: {
            order_by,
            search: query,
            page,
            need_json: true,
          },
        })
        .then((i) => i.data);

      const nextPageUrl = f.animes?.next_page_url || null;

      const res = {
        animes: (f.animes?.data || []).map((p) => ({
          url: this.u + `/anime/${p.id}/${p.slug}`,
          ...p,
        })),
        hasNextPage: !!nextPageUrl,
        nextPage: this._parseNextPage(nextPageUrl),
      };
      return res;
    } catch (error) {
      throw error;
    }
  }

  async detail(url, page = 0) {
    try {
      const wb = await this.is.get(url, {
        params: { page },
      });

      const $ = cheerio.load(wb.data);

      const [tp, episode, related, tags] = [
        [],
        [],
        [],
        [],
      ];

      const fn = (selector, cb) => {
        $(selector).each((_, l) => cb(l));
      };

      const detail = {
        title: $(".anime__details__title h3").text().trim(),
        alternativeTitle: $(".anime__details__title span").text().trim(),
        rating: $(".anime__details__pic__mobile .ep").text().trim(),
        img: $(".anime__details__pic__mobile").attr("data-setbg"),
        sinopsis: $("#synopsisField").text().trim(),
      };

      fn(".anime__details__widget ul li .row", (l) => {
        let t1 = $(l)
          .find(".col-3 span")
          .text()
          .replace(/:/, "")
          .toLowerCase();
        const t2 = $(l).find(".col-9");
        let t3;

        if (t2.find("a").length >= 2) {
          t3 = [];
          t2.find("a").each((_, h) => {
            t3.push($(h).text().trim());
          });
          if (t1 === "tayang") t3 = t3.join(" ");
        } else {
          t3 = t2.text().trim();
        }

        detail[t1] = t3;
      });

      const strEpsHtml = $("#episodeLists").attr("data-content") || "";
      const strEps = cheerio.load(strEpsHtml);

      strEps(".btn-danger").each((_, el) => {
        const title = strEps(el).text().trim();
        const link = strEps(el).attr("href");
        tp.push({
          title,
          episode: parseInt(title.replace(/\D/g, "")) || null,
          link,
        });
      });

      tp.reverse().forEach((ep, id) =>
        episode.push({
          index: id + 1,
          ...ep,
        })
      );

      fn(".anime__details__review .breadcrumb__links__v2 div a", (l) => {
        related.push({
          title: $(l).text().slice(2).trim(),
          url: $(l).attr("href"),
        });
      });

      fn("#tagSection .breadcrumb__links__v2__tags a", (l) => {
        tags.push($(l).text().trim().replace(",", ""));
      });

      const htmlEps = strEps.html() || "";
      const matchNextPage = htmlEps.match(/page=(.*?)" (.*)fa-forward/);
      const nextPage = matchNextPage ? matchNextPage[1] : null;

      return {
        id: $("input#animeId").attr("value"),
        detail,
        episode,
        related,
        tags,
        nextEpsode: !!nextPage,
        pageNextEpsode: nextPage,
      };
    } catch (error) {
      throw error;
    }
  }

  async ex(a, b) {
    try {
      const $ = cheerio.load(b.data);
      const c = $(`.row div[${this.targetEnv}]`).attr(this.targetEnv);

      if (!c) {
        throw new Error("Env key tidak ditemukan di halaman.");
      }

      const d = await this.is.get(`/assets/js/${c}.js`);
      const e = d.data.match(/= ({[\s\S]*?});/)?.[1];

      if (!e) {
        throw new Error("Konfigurasi JS tidak ditemukan.");
      }

      const j1 = e.match(/MIX_AUTH_ROUTE_PARAM: '(.*?)',/)?.[1];
      const j2 = e.match(/MIX_PAGE_TOKEN_KEY: '(.*?)',/)?.[1];
      const j3 = e.match(/MIX_STREAM_SERVER_KEY: '(.*?)',/)?.[1];

      if (!j1 || !j2 || !j3) {
        throw new Error("Key konfigurasi tidak lengkap.");
      }

      const f = await this.is.get(`/assets/${j1}`);
      const param = [
        [j2, (f.data || "").trim()],
        [j3, "kuramadrive"],
        ["page", "1"],
      ];

      const g = new URL(a);
      param.forEach(([k, v]) => g.searchParams.set(k, v));

      return g.toString();
    } catch (e) {
      throw new Error("Failed to init url: " + (e?.message || e));
    }
  }

  async episode(url) {
    try {
      const t = await this.is.get(url);
      const k = await this.ex(url, t);

      // handle cookie aman
      const rawCookies = t.headers?.["set-cookie"] || [];
      const cookieHeader = Array.isArray(rawCookies)
        ? rawCookies.map((i) => `${i};`).join("")
        : String(rawCookies || "");

      const a = await axios.get(k, {
        headers: {
          cookie: cookieHeader,
        },
      });

      const $ = cheerio.load(a.data);
      const fn = (selector, cb) => {
        $(selector).each((_, l) => cb(l));
      };

      const result = {
        id: $("input#animeId").attr("value"),
        postId: $("input#postId").attr("value"),
        title: $("title").text(),
        lastUpdated: $(".breadcrumb__links__v2 > span:nth-child(2)")
          .text()
          .split("\n")[0]
          .trim(),
        batch: $('a.ep-button[type="batch"]').attr("href") || null,
        episode: [],
        download: [],
        video: [],
      };

      fn('a.ep-button[type="episode"]', (l) => {
        const text = $(l).text().trim();
        if (text) {
          result.episode.push({
            episode: text,
            url: $(l).attr("href"),
          });
        }
      });

      $("#animeDownloadLink")
        .find("h6")
        .each((_, l) => {
          let ne = $(l).next();
          const reso = { type: $(l).text().trim(), links: [] };

          while (ne.length && !ne.is("h6") && !ne.is("br")) {
            if (ne.is("a")) {
              reso.links.push({
                name: ne.text().trim(),
                url: ne.attr("href"),
                recommended: ne.find("i.fa-fire").length > 0,
              });
            }
            ne = ne.next();
          }

          if (reso.links.length > 0) {
            result.download.push(reso);
          }
        });

      fn("#player source", (l) => {
        result.video.push({
          quality: $(l).attr("size"),
          url: $(l).attr("src"),
        });
      });

      return result;
    } catch (e) {
      throw e;
    }
  }

  async schedule(day, page = 1) {
    try {
      const f = await this.is
        .get("/schedule", {
          params: {
            scheduled_day: day,
            page,
            need_json: true,
          },
        })
        .then((i) => i.data);

      const nextPageUrl = f.animes?.next_page_url || null;

      const res = {
        animes: (f.animes?.data || []).map((p) => ({
          url: this.u + `/anime/${p.id}/${p.slug}`,
          ...p,
        })),
        hasNextPage: !!nextPageUrl,
        nextPage: this._parseNextPage(nextPageUrl),
      };
      return res;
    } catch (e) {
      throw e;
    }
  }

  async ongoing(page = 1) {
    try {
      const f = await this.is
        .get("/", {
          params: {
            page,
            need_json: true,
          },
        })
        .then((i) => i.data);

      const nextPageUrl = f.ongoingAnimes?.next_page_url || null;

      const res = {
        animes: (f.ongoingAnimes?.data || []).map((p) => ({
          url: this.u + `/anime/${p.id}/${p.slug}`,
          ...p,
        })),
        hasNextPage: !!nextPageUrl,
        nextPage: this._parseNextPage(nextPageUrl),
      };
      return res;
    } catch (e) {
      throw e;
    }
  }

  async finished(page = 1) {
    try {
      const f = await this.is
        .get("/", {
          params: {
            page,
            need_json: true,
          },
        })
        .then((i) => i.data);

      const nextPageUrl = f.finishedAnimes?.next_page_url || null;

      const res = {
        animes: (f.finishedAnimes?.data || []).map((p) => ({
          url: this.u + `/anime/${p.id}/${p.slug}`,
          ...p,
        })),
        hasNextPage: !!nextPageUrl,
        nextPage: this._parseNextPage(nextPageUrl),
      };
      return res;
    } catch (e) {
      throw e;
    }
  }

  async movie(page = 1) {
    try {
      const f = await this.is
        .get("/", {
          params: {
            page,
            need_json: true,
          },
        })
        .then((i) => i.data);

      const nextPageUrl = f.movieAnimes?.next_page_url || null;

      const res = {
        animes: (f.movieAnimes?.data || []).map((p) => ({
          url: this.u + `/anime/${p.id}/${p.slug}`,
          ...p,
        })),
        hasNextPage: !!nextPageUrl,
        nextPage: this._parseNextPage(nextPageUrl),
      };
      return res;
    } catch (e) {
      throw e;
    }
  }
}

module.exports = new Kurama();