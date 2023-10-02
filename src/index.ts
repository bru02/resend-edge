import { RequireAtLeastOne, RequireExactlyOne } from "./types";

interface EmailRenderOptions {
  /**
   * The React component used to write the message.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  react?: React.ReactElement | React.ReactNode | null;
  /**
   * The HTML version of the message.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  html?: string;
  /**
   * The plain text version of the message.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  text?: string;
}

interface CreateEmailBaseOptions extends EmailRenderOptions {
  /**
   * Filename and content of attachments (max 40mb per email)
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  attachments?: Attachment[];
  /**
   * Blind carbon copy recipient email address. For multiple addresses, send as an array of strings.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  bcc?: string | string[];
  /**
   * Carbon copy recipient email address. For multiple addresses, send as an array of strings.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  cc?: string | string[];
  /**
   * Sender email address. To include a friendly name, use the format `"Your Name <sender@domain.com>"`
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  from: string;
  /**
   * Custom headers to add to the email.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  headers?: Record<string, string>;
  /**
   * Reply-to email address. For multiple addresses, send as an array of strings.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  reply_to?: string | string[];
  /**
   * Email subject.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  subject: string;
  /**
   * Email tags
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  tags?: Tag[];
  /**
   * Recipient email address. For multiple addresses, send as an array of strings. Max 50.
   *
   * @link https://resend.com/api-reference/emails/send-email#body-parameters
   */
  to: string | string[];
}

export type CreateEmailOptions = RequireAtLeastOne<EmailRenderOptions> &
  CreateEmailBaseOptions;

export interface CreateEmailResponse {
  /** The ID of the newly created email. */
  id: string;
}

interface BaseAttachment {
  /** Content of an attached file. */
  content?: string | Blob | ArrayBuffer;
  /** Name of attached file. */
  filename?: string | false | undefined;
  /** Path where the attachment file is hosted */
  path?: string;
}

type Attachment = File | RequireExactlyOne<BaseAttachment, "content" | "path">;

type Tag = {
  /**
   * The name of the email tag.
   * It can only contain ASCII letters (a–z, A–Z), numbers (0–9), underscores (_), or dashes (-).
   * It can contain no more than 256 characters.
   */
  name: string;

  /**
   * The value of the email tag.
   * It can only contain ASCII letters (a–z, A–Z), numbers (0–9), underscores (_), or dashes (-).
   * It can contain no more than 256 characters.
   */
  value: string;
};

export async function send(
  options: CreateEmailOptions,
  apiKey: string
): Promise<CreateEmailResponse> {
  if (options.react) {
    const { render } = await import("@react-email/render");
    
    // @ts-ignore <3
    options.html = render(options.react);
    // @ts-ignore <3
    options.text = render(options.react, { plainText: true });

    delete options.react;
  }

  if (options.attachments)
    options.attachments = await Promise.all(
      options.attachments.map(async (attachment) => {
        if (attachment instanceof File) {
          attachment = {
            content: attachment,
            filename: attachment.name,
          };
        } else if (attachment.content instanceof Blob) {
          attachment.content = await attachment.content.arrayBuffer();
        } else if (attachment.content instanceof ArrayBuffer) {
          attachment.content = bytesToBase64(attachment.content);
        }

        return attachment;
      })
    );

  return fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...options.headers,
    },
    body: JSON.stringify(options),
  }).then((res) => res.json());
}

export class Resend {
  constructor(private apiKey: string) {}

  send(options: CreateEmailOptions) {
    return send(options, this.apiKey);
  }

  emails = {
    send: (options: CreateEmailOptions) => this.send(options),
  };
}

function bytesToBase64(bytes: ArrayBuffer) {
  const binString = Array.from(new Uint8Array(bytes), (x) =>
    String.fromCodePoint(x)
  ).join("");
  return btoa(binString);
}
