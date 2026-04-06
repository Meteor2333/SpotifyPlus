"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const react_1 = __importDefault(require("react"));
const test_overlay_1 = __importDefault(require("./test-overlay"));
//@ts-expect-error
SpotifyPlus.Surfaces.register('lyrics-view', (surface) => {
    return react_1.default.createElement(test_overlay_1.default, null);
});
//@ts-expect-error
const sideDrawer = new SpotifyPlus.SideDrawer('React Item!', () => {
    return react_1.default.createElement(test_overlay_1.default, null);
}).register();
