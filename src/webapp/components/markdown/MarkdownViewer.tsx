import _ from "lodash";
import React from "react";
import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSanitize from "rehype-sanitize";
import "./MarkdownViewer.css";

const components = {
    blockquote: ({ children, ...props }: any) => (
        <details>
            <summary>{props.title ?? "Note"}</summary>
            {children?.length === 1 && _.isString(children[0]) ? (
                <ReactMarkdown>{children[0]}</ReactMarkdown>
            ) : (
                children
            )}
        </details>
    ),
    video: (props: any) => <video width="100%" controls {...props}></video>,
    "video-gif": (props: any) => <video width="100%" autoPlay loop muted playsInline src={props.src}></video>,
    pdf: (props: any) => <embed width="100%" height="600px" src={props.src} />,
    //eslint-disable-next-line jsx-a11y/anchor-has-content
    a: (props: any) => <a target="_blank" {...props} />,
};

export const MarkdownViewer: React.FC<{ source: string }> = ({ source }) => (
    <ReactMarkdown
        className="markdown-viewer"
        rehypePlugins={[rehypeRaw, [rehypeSanitize, validHtml]]}
        components={components}
    >
        {source}
    </ReactMarkdown>
);

export const validHtml = {
    strip: ["script"],
    clobberPrefix: "user-content-",
    clobber: ["name", "id"],
    ancestors: {
        tbody: ["table"],
        tfoot: ["table"],
        thead: ["table"],
        td: ["table"],
        th: ["table"],
        tr: ["table"],
    },
    protocols: {
        href: ["http", "https", "mailto"],
        cite: ["http", "https"],
        src: ["http", "https"],
        longDesc: ["http", "https"],
    },
    tagNames: [
        "embed",
        "iframe",
        "h1",
        "h2",
        "h3",
        "h4",
        "h5",
        "h6",
        "br",
        "b",
        "i",
        "strong",
        "em",
        "a",
        "pre",
        "code",
        "img",
        "tt",
        "div",
        "ins",
        "del",
        "sup",
        "sub",
        "p",
        "ol",
        "ul",
        "table",
        "thead",
        "tbody",
        "tfoot",
        "blockquote",
        "dl",
        "dt",
        "dd",
        "kbd",
        "q",
        "samp",
        "var",
        "hr",
        "ruby",
        "rt",
        "rp",
        "li",
        "tr",
        "td",
        "th",
        "s",
        "strike",
        "summary",
        "details",
        "caption",
        "figure",
        "figcaption",
        "abbr",
        "bdo",
        "cite",
        "dfn",
        "mark",
        "small",
        "span",
        "time",
        "wbr",
        "input",
        "video",
        "video-gif",
        "pdf",
    ],
    attributes: {
        embed: ["src"],
        iframe: ["src"],
        a: ["href"],
        img: ["src", "longDesc"],
        input: [
            ["type", "checkbox"],
            ["disabled", true],
        ],
        li: [["className", "task-list-item"]],
        div: ["itemScope", "itemType"],
        blockquote: ["cite"],
        del: ["cite"],
        ins: ["cite"],
        q: ["cite"],
        video: ["src", "playsinline", "controls", "autoplay", "loop", "mute"],
        "video-gif": ["src"],
        pdf: ["src"],
        "*": [
            "abbr",
            "accept",
            "acceptCharset",
            "accessKey",
            "action",
            "align",
            "alt",
            "ariaDescribedBy",
            "ariaHidden",
            "ariaLabel",
            "ariaLabelledBy",
            "axis",
            "border",
            "cellPadding",
            "cellSpacing",
            "char",
            "charOff",
            "charSet",
            "checked",
            "clear",
            "cols",
            "colSpan",
            "color",
            "compact",
            "coords",
            "dateTime",
            "dir",
            "disabled",
            "encType",
            "htmlFor",
            "frame",
            "headers",
            "height",
            "hrefLang",
            "hSpace",
            "isMap",
            "id",
            "label",
            "lang",
            "maxLength",
            "media",
            "method",
            "multiple",
            "name",
            "noHref",
            "noShade",
            "noWrap",
            "open",
            "prompt",
            "readOnly",
            "rel",
            "rev",
            "rows",
            "rowSpan",
            "rules",
            "scope",
            "selected",
            "shape",
            "size",
            "span",
            "start",
            "summary",
            "tabIndex",
            "target",
            "title",
            "type",
            "useMap",
            "vAlign",
            "value",
            "vSpace",
            "width",
            "itemProp",
        ],
    },
    required: {
        input: {
            type: "checkbox",
            disabled: true,
        },
    },
};
