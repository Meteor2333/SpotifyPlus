import React from 'react';
import Reconciler from 'react-reconciler';
import { DefaultEventPriority } from 'react-reconciler/constants';

const HOST_CONTEXT = {};
let currentUpdatePriority = DefaultEventPriority;

type HostNode = {
    id: number;
    type: string;
    props: Record<string, any>;
    children: Array<HostNode | TextNode>;
};

type TextNode = {
    id: number;
    type: 'TEXT_INSTANCE';
    text: string;
};

type RootContainer = {
    children: Array<HostNode | TextNode>;
};

export type MutationOp =
    | { op: 'createNode'; id: number; type: string; props: Record<string, any> }
    | { op: 'createText'; id: number; text: string }
    | { op: 'appendChild'; parentId: number; childId: number }
    | { op: 'appendToRoot'; childId: number }
    | { op: 'insertBefore'; parentId: number; childId: number; beforeChildId: number }
    | { op: 'insertInRootBefore'; childId: number; beforeChildId: number }
    | { op: 'removeChild'; parentId: number; childId: number }
    | { op: 'removeFromRoot'; childId: number }
    | { op: 'updateProps'; id: number; props: Record<string, any> }
    | { op: 'updateText'; id: number; text: string }
    | { op: 'destroyNode'; id: number };

let nextId = 1;
let pendingOps: MutationOp[] = [];

function createId() {
    return nextId++;
}

function sanitizeProps(props: Record<string, any> | null | undefined) {
    const result: Record<string, any> = {};
    if (!props) return result;

    for (const [key, value] of Object.entries(props)) {
        if (key === 'children') continue;

        if (value === undefined) {
            result[key] = null;
        } else if (typeof value === 'function') {
            result[key] = '[Function]';
        } else if (
            value === null ||
            typeof value === 'string' ||
            typeof value === 'number' ||
            typeof value === 'boolean'
        ) {
            result[key] = value;
        } else if (Array.isArray(value)) {
            result[key] = '[Array]';
        } else {
            result[key] = `[${typeof value}]`;
        }
    }

    return result;
}

function serializeNode(node: HostNode | TextNode): any {
    if (node.type === 'TEXT_INSTANCE') {
        return {
            id: node.id,
            type: node.type,
            text: (node as TextNode).text,
        };
    }

    return {
        id: node.id,
        type: node.type,
        props: sanitizeProps((node as HostNode).props),
        children: (node as HostNode).children.map(serializeNode),
    };
}

function dumpTree(container: RootContainer) {
    return {
        children: container.children.map(serializeNode),
    };
}

type CommitListener = (ops: MutationOp[], tree: any) => void;

const commitListeners = new Map<string, CommitListener>();

export function setCommitListener(surfaceId: string, listener: CommitListener) {
    commitListeners.set(surfaceId, listener);
}

export function clearCommitListener(surfaceId: string) {
    commitListeners.delete(surfaceId);
}

function destroyInstance(instance: HostNode | TextNode | null | undefined) {
    if (!instance) return;
    pendingOps.push({ op: 'destroyNode', id: instance.id });
}

const hostConfig = {
    supportsMutation: true,
    isPrimaryRenderer: true,
    now: Date.now,

    getRootHostContext() {
        return HOST_CONTEXT;
    },

    getChildHostContext(parentHostContext: object) {
        return parentHostContext;
    },

    getPublicInstance(instance: any) {
        return instance;
    },

    prepareForCommit() {
        return null;
    },

    resetAfterCommit(container: RootContainer) {
        const surfaceId = (container as any).__surfaceId as string;
        const ops = pendingOps;
        pendingOps = [];

        const tree = dumpTree(container);
        const listener = commitListeners.get(surfaceId);

        if (listener) listener(ops, tree);
        else {
            console.log('=== UI OPS ===');
            console.log(JSON.stringify(ops, null, 2));
            console.log('=== UI TREE ===');
            console.log(JSON.stringify(tree, null, 2));
        }
    },

    preparePortalMount() { },

    shouldSetTextContent() {
        return false;
    },

    createInstance(type: string, props: any): HostNode {
        const { children, ...rest } = props ?? {};
        const node: HostNode = {
            id: createId(),
            type,
            props: sanitizeProps(rest),
            children: [],
        };

        pendingOps.push({
            op: 'createNode',
            id: node.id,
            type: node.type,
            props: node.props,
        });

        return node;
    },

    createTextInstance(text: string): TextNode {
        const node: TextNode = {
            id: createId(),
            type: 'TEXT_INSTANCE',
            text,
        };

        pendingOps.push({
            op: 'createText',
            id: node.id,
            text: node.text,
        });

        return node;
    },

    appendInitialChild(parent: HostNode, child: HostNode | TextNode) {
        parent.children.push(child);
        pendingOps.push({ op: 'appendChild', parentId: parent.id, childId: child.id });
    },

    appendChild(parent: HostNode, child: HostNode | TextNode) {
        parent.children.push(child);
        pendingOps.push({ op: 'appendChild', parentId: parent.id, childId: child.id });
    },

    appendChildToContainer(container: RootContainer, child: HostNode | TextNode) {
        container.children.push(child);
        pendingOps.push({ op: 'appendToRoot', childId: child.id });
    },

    insertBefore(parent: HostNode, child: HostNode | TextNode, beforeChild: HostNode | TextNode) {
        const existingIndex = parent.children.indexOf(child);
        if (existingIndex >= 0) parent.children.splice(existingIndex, 1);

        const beforeIndex = parent.children.indexOf(beforeChild);
        if (beforeIndex >= 0) parent.children.splice(beforeIndex, 0, child);
        else parent.children.push(child);

        pendingOps.push({
            op: 'insertBefore',
            parentId: parent.id,
            childId: child.id,
            beforeChildId: beforeChild.id,
        });
    },

    insertInContainerBefore(container: RootContainer, child: HostNode | TextNode, beforeChild: HostNode | TextNode) {
        const existingIndex = container.children.indexOf(child);
        if (existingIndex >= 0) container.children.splice(existingIndex, 1);

        const beforeIndex = container.children.indexOf(beforeChild);
        if (beforeIndex >= 0) container.children.splice(beforeIndex, 0, child);
        else container.children.push(child);

        pendingOps.push({
            op: 'insertInRootBefore',
            childId: child.id,
            beforeChildId: beforeChild.id,
        });
    },

    removeChild(parent: HostNode, child: HostNode | TextNode) {
        parent.children = parent.children.filter(c => c !== child);
        pendingOps.push({ op: 'removeChild', parentId: parent.id, childId: child.id });
    },

    removeChildFromContainer(container: RootContainer, child: HostNode | TextNode) {
        container.children = container.children.filter(c => c !== child);
        pendingOps.push({ op: 'removeFromRoot', childId: child.id });
    },

    finalizeInitialChildren() {
        return false;
    },

    prepareUpdate(_instance: HostNode, _type: string, oldProps: any, newProps: any) {
        const { children: _oldChildren, ...oldRest } = oldProps ?? {};
        const { children: _newChildren, ...newRest } = newProps ?? {};

        const oldSanitized = sanitizeProps(oldRest);
        const newSanitized = sanitizeProps(newRest);

        return JSON.stringify(oldSanitized) !== JSON.stringify(newSanitized) ? newSanitized : null;
    },

    commitUpdate(instance: HostNode, _type: string, _oldProps: any, _newProps: any, updatePayload: any) {
        if (!updatePayload) return;

        instance.props = updatePayload;
        pendingOps.push({
            op: 'updateProps',
            id: instance.id,
            props: updatePayload,
        });
    },

    commitTextUpdate(textInstance: TextNode, _oldText: string, newText: string) {
        textInstance.text = newText;
        pendingOps.push({
            op: 'updateText',
            id: textInstance.id,
            text: newText,
        });
    },

    resetTextContent(instance: HostNode) {
        instance.children = instance.children.filter(child => child.type !== 'TEXT_INSTANCE');
    },

    clearContainer(container: RootContainer) {
        container.children = [];
    },

    scheduleTimeout: setTimeout,
    cancelTimeout: clearTimeout,
    noTimeout: -1,

    getInstanceFromNode() {
        return null;
    },

    beforeActiveInstanceBlur() { },
    afterActiveInstanceBlur() { },
    prepareScopeUpdate() { },
    getInstanceFromScope() {
        return null;
    },

    detachDeletedInstance(instance: HostNode | TextNode) {
        destroyInstance(instance);
    },

    supportsMicrotasks: true,
    scheduleMicrotask: queueMicrotask,

    setCurrentUpdatePriority(newPriority: number) {
        currentUpdatePriority = newPriority;
    },

    getCurrentUpdatePriority() {
        return currentUpdatePriority;
    },

    resolveUpdatePriority() {
        return currentUpdatePriority || DefaultEventPriority;
    },

    getCurrentEventPriority() {
        return currentUpdatePriority || DefaultEventPriority;
    },

    trackSchedulerEvent() { },

    resolveEventType() {
        return null;
    },

    resolveEventTimeStamp() {
        return Date.now();
    },

    shouldAttemptEagerTransition() {
        return false;
    },

    requestPostPaintCallback(callback: (time: number) => void) {
        setTimeout(() => callback(Date.now()), 0);
    },

    maySuspendCommit() {
        return false;
    },

    preloadInstance() {
        return true;
    },

    startSuspendingCommit() { },
    suspendInstance() { },
    waitForCommitToBeReady() {
        return null;
    },

    resetFormInstance() { },

    NotPendingTransition: null,
    HostTransitionContext: {
        $$typeof: Symbol.for('react.context'),
        Consumer: null as any,
        Provider: null as any,
        _currentValue: null,
        _currentValue2: null,
        _threadCount: 0,
    },
};

const reconciler = Reconciler(hostConfig as any);
const noop = () => { };

export function createRoot(surfaceId: string) {
    const container: RootContainer = { children: [] };
    (container as any).__surfaceId = surfaceId;

    const root = reconciler.createContainer(container, 0, null, false, null, '', noop, noop, noop, noop);

    return {
        render(element: React.ReactNode) {
            reconciler.updateContainerSync(element, root, null, null);
            reconciler.flushSyncWork();
        },
        unmount() {
            reconciler.updateContainerSync(null, root, null, null);
            reconciler.flushSyncWork();
        },
        getTree() {
            return container;
        },
    };
}
