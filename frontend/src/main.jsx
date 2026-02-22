import App from "./App.jsx";
import "./index.css";
import { store, persistor } from "./state/store.js";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { createRoot } from "react-dom/client";

createRoot(document.getElementById("root")).render(
  <Provider store={store}>           {/* ✅ Provider first */}
    <PersistGate loading={null} persistor={persistor}>   {/* ✅ PersistGate inside */}
      <App />
    </PersistGate>
  </Provider>
);