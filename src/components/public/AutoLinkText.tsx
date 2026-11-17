import { Fragment } from 'react';

const TRAILING_PUNCTUATION = /[.,!?;:，。！？；：、）】》」』”’]+$/;

type Props = {
  text: string;
};

export default function AutoLinkText({ text }: Props) {
  const parts = text.split(/(https?:\/\/[^\s<]+)/gi);

  return (
    <>
      {parts.map((part, index) => {
        if (!/^https?:\/\//i.test(part)) return part;

        const url = part.replace(TRAILING_PUNCTUATION, '');
        return (
          <Fragment key={`${url}-${index}`}>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline break-words"
            >
              {url}
            </a>
            {part.slice(url.length)}
          </Fragment>
        );
      })}
    </>
  );
}
