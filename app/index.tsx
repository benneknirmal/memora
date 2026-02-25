import React, { useState, useRef, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    FlatList,
    StyleSheet,
    SafeAreaView,
    ActivityIndicator,
    KeyboardAvoidingView,
    Platform,
} from 'react-native';
import { Agent } from '@/core/Agent';
import { OpenAIProvider } from '@/core/llm/OpenAIProvider';
import { ToolRegistry } from '@/core/tools/ToolRegistry';
import { dbService } from '@/core/storage/DatabaseService';
import {
    MemoryToolDefinition,
    GetMemoryToolDefinition,
    DeleteMemoryToolDefinition,
    createMemoryExecutor,
    createGetMemoryExecutor,
    createDeleteMemoryExecutor,
} from '@/core/tools/MemoryTool';
import {
    WebSearchToolDefinition,
    WebFetchToolDefinition,
    executeWebSearch,
    executeWebFetch,
} from '@/core/tools/WebFetchTool';
import { WeatherToolDefinition, executeGetWeather } from '@/core/tools/WeatherTool';
import { TimeToolDefinition, executeTimeAction } from '@/core/tools/TimeTool';
import Constants from 'expo-constants';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
}

// ─── Agent Setup ──────────────────────────────────────────────────────────────

async function buildAgent(): Promise<Agent> {
    const apiKey = Constants.expoConfig?.extra?.openaiApiKey
        || process.env.EXPO_PUBLIC_OPENAI_API_KEY
        || '';

    const provider = new OpenAIProvider({
        apiKey,
        model: process.env.EXPO_PUBLIC_OPENAI_MODEL || 'gpt-4o-mini',
    });

    const registry = new ToolRegistry();

    // Register memory tools
    registry.register(MemoryToolDefinition, await createMemoryExecutor(dbService));
    registry.register(GetMemoryToolDefinition, await createGetMemoryExecutor(dbService));
    registry.register(DeleteMemoryToolDefinition, await createDeleteMemoryExecutor(dbService));

    // Register web tools
    registry.register(WebSearchToolDefinition, executeWebSearch);
    registry.register(WebFetchToolDefinition, executeWebFetch);

    // Register weather tool
    registry.register(WeatherToolDefinition, executeGetWeather);

    // Register time tool
    registry.register(TimeToolDefinition, executeTimeAction);

    const agent = new Agent(provider, registry, {
        model: 'gpt-4o-mini',
        maxIterations: 10,
        maxHistory: 20,
        systemPrompt: `You are Memora, a helpful and friendly AI assistant.
You have a persistent memory system — use it proactively to remember important things about the user.
Always introduce yourself as Memora. Be concise, warm, and genuinely helpful.`,
    });

    return agent;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function HomeScreen() {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [status, setStatus] = useState('');
    const agentRef = useRef<Agent | null>(null);
    const flatListRef = useRef<FlatList<ChatMessage>>(null);

    useEffect(() => {
        buildAgent().then(agent => {
            agentRef.current = agent;
            agent.onStatus = setStatus;
        });
    }, []);

    const sendMessage = async () => {
        if (!input.trim() || !agentRef.current || isLoading) return;

        const userText = input.trim();
        setInput('');

        const userMsg: ChatMessage = {
            id: Date.now().toString(),
            role: 'user',
            content: userText,
        };
        setMessages((prev: ChatMessage[]) => [...prev, userMsg]);
        setIsLoading(true);
        setStatus('Thinking...');

        try {
            const response = await agentRef.current.process(userText);
            const assistantMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: response,
            };
            setMessages((prev: ChatMessage[]) => [...prev, assistantMsg]);
        } catch (error) {
            const errMsg: ChatMessage = {
                id: (Date.now() + 1).toString(),
                role: 'assistant',
                content: 'Sorry, something went wrong. Please check your API key in .env.',
            };
            setMessages((prev: ChatMessage[]) => [...prev, errMsg]);
        } finally {
            setIsLoading(false);
            setStatus('');
        }
    };

    const renderMessage = ({ item }: { item: ChatMessage }) => (
        <View style={[
            styles.bubble,
            item.role === 'user' ? styles.userBubble : styles.assistantBubble
        ]}>
            <Text style={[
                styles.bubbleText,
                item.role === 'user' ? styles.userText : styles.assistantText
            ]}>
                {item.content}
            </Text>
        </View>
    );

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>Memora</Text>
                <Text style={styles.headerSub}>Your AI with Memory</Text>
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
                keyboardVerticalOffset={90}
            >
                <FlatList
                    ref={flatListRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={({ item }: { item: ChatMessage }) => renderMessage({ item })}
                    contentContainerStyle={styles.messageList}
                    onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
                    ListEmptyComponent={
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyTitle}>👋 Hi, I'm Memora</Text>
                            <Text style={styles.emptyText}>
                                I can remember things about you, check the weather, search the web, and more.{'\n\n'}
                                Try saying: <Text style={styles.emptyHint}>"My name is [your name]"</Text>
                            </Text>
                        </View>
                    }
                />

                {(isLoading || status) && (
                    <View style={styles.statusBar}>
                        <ActivityIndicator size="small" color="#7c3aed" />
                        <Text style={styles.statusText}>{status || 'Thinking...'}</Text>
                    </View>
                )}

                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={input}
                        onChangeText={setInput}
                        placeholder="Message Memora..."
                        placeholderTextColor="#666"
                        multiline
                        onSubmitEditing={sendMessage}
                        returnKeyType="send"
                    />
                    <TouchableOpacity
                        style={[styles.sendButton, (!input.trim() || isLoading) && styles.sendButtonDisabled]}
                        onPress={sendMessage}
                        disabled={!input.trim() || isLoading}
                    >
                        <Text style={styles.sendButtonText}>↑</Text>
                    </TouchableOpacity>
                </View>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0f0f0f',
    },
    flex: { flex: 1 },
    header: {
        padding: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#1e1e1e',
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '700',
        color: '#ffffff',
    },
    headerSub: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    messageList: {
        padding: 16,
        paddingBottom: 32,
        flexGrow: 1,
    },
    bubble: {
        maxWidth: '80%',
        borderRadius: 18,
        padding: 12,
        marginBottom: 10,
    },
    userBubble: {
        alignSelf: 'flex-end',
        backgroundColor: '#7c3aed',
    },
    assistantBubble: {
        alignSelf: 'flex-start',
        backgroundColor: '#1e1e1e',
    },
    bubbleText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: { color: '#fff' },
    assistantText: { color: '#e5e5e5' },
    emptyState: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 80,
        paddingHorizontal: 32,
    },
    emptyTitle: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 12,
        textAlign: 'center',
    },
    emptyText: {
        fontSize: 15,
        color: '#888',
        textAlign: 'center',
        lineHeight: 24,
    },
    emptyHint: {
        color: '#7c3aed',
        fontStyle: 'italic',
    },
    statusBar: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        gap: 8,
    },
    statusText: {
        color: '#888',
        fontSize: 13,
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        padding: 12,
        paddingBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#1e1e1e',
        gap: 8,
    },
    input: {
        flex: 1,
        backgroundColor: '#1e1e1e',
        borderRadius: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        color: '#fff',
        fontSize: 15,
        maxHeight: 120,
    },
    sendButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#7c3aed',
        alignItems: 'center',
        justifyContent: 'center',
    },
    sendButtonDisabled: {
        backgroundColor: '#333',
    },
    sendButtonText: {
        color: '#fff',
        fontSize: 20,
        fontWeight: '700',
    },
});
