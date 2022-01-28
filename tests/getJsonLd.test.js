// Tests for parse.js
const {assert} = require('chai');
const {getJsonLd} = require('../parser');
const {stringToDom} = require('./test-utils');

describe('Get JSON-LD', function() {
    const sampleDescription = 'A test page.';
    const sampleIcon = 'http://www.example.com/favicon.ico';
    const sampleImageHTTP = 'http://www.example.com/image.png';
    const sampleImageHTTPS = 'https://www.example.com/secure_image.png';
    const sampleTitle = 'Page Title';
    const sampleType = 'article';
    const sampleUrl = 'http://www.example.com/';
    const sampleProviderName = 'Example Provider';
    const sampleJsonLdType = 'NewsArticle';


    const sampleHtml = `
      <html lang="en-CA">
      <head>
        <meta property="og:description" content="${sampleDescription}" />
        <link rel="icon" href="${sampleIcon}" />
        <meta property="og:image" content="${sampleImageHTTP}" />
        <meta property="og:image:url" content="${sampleImageHTTP}" />
        <meta property="og:image:secure_url" content="${sampleImageHTTPS}" />
        <meta property="og:title" content="${sampleTitle}" />
        <meta property="og:type" content="${sampleType}" />
        <meta property="og:url" content="${sampleUrl}" />
        <meta property="og:site_name" content="${sampleProviderName}" />
        <script type="application/ld+json">
            {
                "@context": "http://schema.org",
                "@type": "BreadcrumbList"
            }
        </script>
        <script type="application/ld+json">
            {
                "@context": "http://schema.org",
                "headline":"${sampleTitle}",
                "description": "${sampleDescription}",
                "@type":"${sampleJsonLdType}",
                "author":{"@type":"Person","name":"John Doe"},
                "datePublished":"2022-01-28T14:36:01+01:00",
                "dateModified":"2022-01-28T14:36:01+01:00",
                "keywords":"metadata,parser"
            }
        </script>
      </head>
      </html>
    `;

    it('parses JSON-LD with right type', () => {
      const doc = stringToDom(sampleHtml);
      const metadata = getJsonLd(doc, ['NewsArticle', 'Article']);
      assert.equal(metadata.description, sampleDescription, `Unable to find ${sampleDescription} in JSON-LD`);
      assert.equal(metadata.headline, sampleTitle, `Unable to find ${sampleTitle} in JSON-LD`);
    });

    it('does not parse JSON-LD if types provided are not found', () => {
        const doc = stringToDom(sampleHtml);
        const metadata = getJsonLd(doc, ['Event']);
        assert.deepEqual(metadata, {}, 'A JSON-LD object was found with provided type');
    });
});