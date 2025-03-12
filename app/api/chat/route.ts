import { BedrockRuntimeClient, InvokeModelCommand } from "@aws-sdk/client-bedrock-runtime";
import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import { getMostRecentUserMessage } from "@/lib/utils";
import { getChatById, saveChat, saveMessages, deleteChatById } from "@/lib/db/queries";

const bedrock = new BedrockRuntimeClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const { id, messages, selectedChatModel } = await request.json();
    console.log("✅ Incoming request:", { id, messages, selectedChatModel });

    console.log("🔍 AWS Region:", process.env.AWS_REGION);
    console.log("🔍 AWS Model ID:", process.env.AWS_BEDROCK_MODEL_ID);

    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("❌ AWS credentials are missing!");
      return NextResponse.json({ error: "AWS credentials are missing" }, { status: 500 });
    }

    // ✅ Check authentication
    const session = await auth();
    console.log("🔍 Session Debug:", JSON.stringify(session, null, 2));

    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized request: No valid session user ID");
      return NextResponse.json({ error: "Unauthorized", session }, { status: 401 });
    }

    console.log("✅ Authenticated User ID:", session.user.id);

    const userMessage = getMostRecentUserMessage(messages);
    if (!userMessage) {
      console.error("❌ No user message found");
      return NextResponse.json({ error: "No user message found" }, { status: 400 });
    }
    console.log("✅ User message:", userMessage.content);

    let chat = await getChatById({ id });
    if (!chat) {
      chat = {
        id,
        userId: session.user.id,
        title: userMessage.content,
        createdAt: new Date(),
        visibility: "private",
      };
      await saveChat(chat);
    }

    await saveMessages({
      messages: [{ ...userMessage, createdAt: new Date(), chatId: id }],
    });

    const modelId = process.env.AWS_BEDROCK_MODEL_ID!;
    if (!modelId) {
      console.error("❌ AWS Bedrock Model ID is missing!");
      return NextResponse.json({ error: "AWS Bedrock Model ID is missing" }, { status: 500 });
    }

    const response = await bedrock.send(
      new InvokeModelCommand({
        modelId,
        contentType: "application/json",
        accept: "application/json",
        body: JSON.stringify({
          prompt: userMessage.content,
          max_tokens: 150,
        }),
      })
    );

    let parsedResponse;
    try {
      parsedResponse = JSON.parse(new TextDecoder().decode(response.body));
      console.log("✅ AWS Bedrock Response:", parsedResponse);
    } catch (jsonError) {
      console.error("🚨 JSON Parse Error:", jsonError);
      return NextResponse.json({ error: "Invalid response from AWS Bedrock" }, { status: 500 });
    }

    const aiReply = parsedResponse.completion || "No response from AI";

    await saveMessages({
      messages: [{ id: id + "-bot", chatId: id, role: "assistant", content: aiReply, createdAt: new Date() }],
    });

    return NextResponse.json({ message: aiReply });
  } catch (error) {
    console.error("🚨 API ERROR:", error);
    return NextResponse.json({ error: "An error occurred processing your request" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return new Response("Not Found", { status: 404 });
    }

    const session = await auth();
    console.log("🔍 Session Debug:", JSON.stringify(session, null, 2));

    if (!session || !session.user || !session.user.id) {
      console.error("❌ Unauthorized request: No valid session user ID");
      return new Response("Unauthorized", { status: 401 });
    }

    const chat = await getChatById({ id });
    if (!chat) {
      return new Response("Chat not found", { status: 404 });
    }

    if (chat.userId !== session.user.id) {
      return new Response("Unauthorized", { status: 401 });
    }

    await deleteChatById({ id });

    return new Response("Chat deleted", { status: 200 });
  } catch (error) {
    console.error("🚨 Chat API DELETE Error:", error);
    return new Response("An error occurred while processing your request", {
      status: 500,
    });
  }
}