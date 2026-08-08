import {
  type Connection,
  Document,
  IncomingMessage,
  MessageReceiver,
  MessageType,
} from "@hocuspocus/server";
import * as encoding from "lib0/encoding";
import { writeUpdate } from "y-protocols/sync";
import * as Y from "yjs";

function updateMessage() {
  const client = new Y.Doc();
  client.getText("elements").insert(0, "viewer-write");
  const update = Y.encodeStateAsUpdate(client);
  client.destroy();
  const encoder = encoding.createEncoder();
  encoding.writeVarUint(encoder, MessageType.Sync);
  writeUpdate(encoder, update);
  return encoding.toUint8Array(encoder);
}

async function applySocketUpdate(readOnly: boolean) {
  const document = new Document("moodboard:board-a");
  const send = jest.fn();
  const connection = {
    readOnly,
    messageAddress: "moodboard:board-a",
    send,
    callbacks: { beforeSync: jest.fn().mockResolvedValue(undefined) },
  } as unknown as Connection;
  const receiver = new MessageReceiver(new IncomingMessage(updateMessage()));
  await receiver.apply(document, connection);
  return { document, send };
}

describe("Moodboard socket role enforcement", () => {
  it("rejects a Viewer's Yjs mutation before it reaches the document", async () => {
    const { document, send } = await applySocketUpdate(true);

    expect(document.getText("elements").toString()).toBe("");
    expect(send).toHaveBeenCalled();
    document.destroy();
  });

  it("accepts the same Yjs mutation from an Editor connection", async () => {
    const { document } = await applySocketUpdate(false);

    expect(document.getText("elements").toString()).toBe("viewer-write");
    document.destroy();
  });
});
