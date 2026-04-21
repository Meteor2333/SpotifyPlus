"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("spotifyplus/react");
const App = () => {
    return ((0, jsx_runtime_1.jsx)(react_1.View, { style: {
            backgroundColor: '#313131'
        }, children: (0, jsx_runtime_1.jsx)(react_1.Text, { textColor: '#FFFFFF', children: "Hello world!" }) }));
};
exports.default = App;
