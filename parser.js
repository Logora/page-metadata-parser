function makeUrlAbsolute(base, relative) {
  return new URL(relative, base).href;
}

function parseUrl(url) {
  return new URL(url).host;
}

export function getProvider(host) {
  return host
    .replace(/www[a-zA-Z0-9]*\./, '')
    .replace('.co.', '.')
    .split('.')
    .slice(0, -1)
    .join(' ');
}

export function buildRuleSet(ruleSet) {
  return (doc, context) => {
    let maxScore = 0;
    let maxValue;
    let accumulativeResults = {};

    for (let currRule = 0; currRule < ruleSet.rules.length; currRule++) {
      const [query, handler, jsonLdRule, accumulative] = ruleSet.rules[currRule];

      let elements;
      if (accumulative) {
        if (!accumulativeResults[query]) {
          accumulativeResults[query] = [];
        }
        elements = Array.from(doc.querySelectorAll(query));
        accumulativeResults[query].push(...elements.map(handler));
      } else {
        elements = (context.jsonLd && jsonLdRule) ? [context.jsonLd[query]] : Array.from(doc.querySelectorAll(query));

        if (elements.length) {
          for (const element of elements) {
            if (element) {
              let score = ruleSet.rules.length - currRule;

              if (ruleSet.scorers) {
                for (const scorer of ruleSet.scorers) {
                  const newScore = scorer(element, score);

                  if (newScore) {
                    score = newScore;
                  }
                }
              }

              if (score > maxScore) {
                maxScore = score;
                maxValue = handler(element);
              }
            }
          }
        }
      }
    }

    Object.keys(accumulativeResults).forEach(query => {
      let combinedValue = accumulativeResults[query].join(', ');
      if (combinedValue.trim()) {
        maxValue = combinedValue.trim();
      }
    });

    if (!maxValue && ruleSet.defaultValue) {
      maxValue = ruleSet.defaultValue(context);
    }

    if (maxValue) {
      if (ruleSet.processors) {
        for (const processor of ruleSet.processors) {
          maxValue = processor(maxValue, context);
        }
      }

      if (maxValue.trim) {
        maxValue = maxValue.trim();
      }

      return maxValue;
    }
  };
}

export const metadataRuleSets = {
  description: {
    rules: [
      ['meta[property="og:description"]', element => element.getAttribute('content')],
      ['description', element => element, true],
      ['meta[name="description" i]', element => element.getAttribute('content')],
    ],
  },

  icon: {
    rules: [
      ['link[rel="apple-touch-icon"]', element => element.getAttribute('href')],
      ['link[rel="apple-touch-icon-precomposed"]', element => element.getAttribute('href')],
      ['link[rel="icon" i]', element => element.getAttribute('href')],
      ['link[rel="fluid-icon"]', element => element.getAttribute('href')],
      ['link[rel="shortcut icon"]', element => element.getAttribute('href')],
      ['link[rel="Shortcut Icon"]', element => element.getAttribute('href')],
      ['link[rel="mask-icon"]', element => element.getAttribute('href')],
    ],
    scorers: [
      // Handles the case where multiple icons are listed with specific sizes ie
      // <link rel="icon" href="small.png" sizes="16x16">
      // <link rel="icon" href="large.png" sizes="32x32">
      (element, score) => {
        const sizes = element.getAttribute('sizes');

        if (sizes) {
          const sizeMatches = sizes.match(/\d+/g);
          if (sizeMatches) {
            return sizeMatches[0];
          }
        }
      }
    ],
    defaultValue: (context) => 'favicon.ico',
    processors: [
      (icon_url, context) => makeUrlAbsolute(context.url, icon_url)
    ]
  },

  image: {
    rules: [
      ['meta[property="og:image:secure_url"]', element => element.getAttribute('content')],
      ['meta[property="og:image"]', element => element.getAttribute('content')],
      ['meta[property="og:image:url"]', element => element.getAttribute('content')],
      ['meta[name="twitter:image"]', element => element.getAttribute('content')],
      ['meta[property="twitter:image"]', element => element.getAttribute('content')],
      ['meta[name="thumbnail"]', element => element.getAttribute('content')],
    ],
    processors: [
      (image_url, context) => makeUrlAbsolute(context.url, image_url)
    ],
  },


  keywords: {
    rules: [
      ['meta[name="keywords" i]', element => element.getAttribute('content')],
      ['meta[property="article:tag"]', element => element.getAttribute('content'), false, true], // Marked as accumulative
      ['meta[property="og:article:tag"]', element => element.getAttribute('content'), false, true],
      ['keywords', element => element, true],
    ],
    processors: [
      (keywords, context) => {
        let allKeywords = [];
        if (keywords) {
          if (Array.isArray(keywords)) {
            allKeywords = keywords.flatMap(keyword =>
              typeof keyword === 'string' || keyword instanceof String ? keyword.split(',').map(keyword => keyword.trim()) : []
            );
          } else if (typeof keywords === 'string' || keywords instanceof String) {
            allKeywords = keywords.split(',').map(keyword => keyword.trim());
          }
        }
        return allKeywords.filter((keyword, index, self) => self.indexOf(keyword) === index);
      }
    ]
  },

  title: {
    rules: [
      ['meta[property="og:title"]', element => element.getAttribute('content')],
      ['headline', element => element, true],
      ['meta[name="twitter:title"]', element => element.getAttribute('content')],
      ['meta[property="twitter:title"]', element => element.getAttribute('content')],
      ['meta[name="hdl"]', element => element.getAttribute('content')],
      ['title', element => element.text],
    ],
  },

  language: {
    rules: [
      ['html[lang]', element => element.getAttribute('lang')],
      ['meta[name="language" i]', element => element.getAttribute('content')],
    ],
    processors: [
      (language, context) => language.split('-')[0]
    ]
  },

  type: {
    rules: [
      ['meta[property="og:type"]', element => element.getAttribute('content')],
    ],
  },

  url: {
    rules: [
      ['a.amp-canurl', element => element.getAttribute('href')],
      ['link[rel="canonical"]', element => element.getAttribute('href')],
      ['meta[property="og:url"]', element => element.getAttribute('content')],
    ],
    defaultValue: (context) => context.url,
    processors: [
      (url, context) => makeUrlAbsolute(context.url, url)
    ]
  },

  provider: {
    rules: [
      ['meta[property="og:site_name"]', element => element.getAttribute('content')]
    ],
    defaultValue: (context) => getProvider(parseUrl(context.url))
  },

  publishedDate: {
    rules: [
      ['meta[property~="article:published_time"]', element => element.getAttribute('content')],
      ['meta[property~="og:updated_time"]', element => element.getAttribute('content')],
      ['datePublished', element => element, true],
    ],
  },
};

export function getMetadata(doc, url, customRuleSets, jsonLdTypes = []) {
  const metadata = {};
  const jsonLd = getJsonLd(doc, jsonLdTypes);
  const context = {
    url,
    jsonLd
  };

  const ruleSets = customRuleSets || metadataRuleSets;

  Object.keys(ruleSets).map(ruleSetKey => {
    const ruleSet = ruleSets[ruleSetKey];
    const builtRuleSet = buildRuleSet(ruleSet);

    metadata[ruleSetKey] = builtRuleSet(doc, context);
  });

  return metadata;
}

export function getJsonLd(doc, jsonLdTypes) {
  const jsonLds = doc.querySelectorAll('script[type="application/ld+json"]');

  try {
    for (const jsonLd of jsonLds) {
      const innerText = JSON.parse(jsonLd.textContent);
      if (Array.isArray(innerText)) {
        return innerText.find(j => jsonLdTypes.includes(j["@type"])) || {};
      } else {
        if (!jsonLdTypes.includes(innerText["@type"])) {
          continue
        }
        return innerText;
      }
    }
  } catch (e) {
    return {};
  }
  return {};
}
