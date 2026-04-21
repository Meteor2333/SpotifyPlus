"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const spotifyplus_1 = require("spotifyplus");
const app_1 = __importDefault(require("./app"));
spotifyplus_1.SpotifyPlus.Surfaces.register('lyrics-view', () => {
    return (0, jsx_runtime_1.jsx)(app_1.default, {});
});
