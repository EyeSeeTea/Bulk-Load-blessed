import React from "react";
import App from "../../components/App";
import { useAppContext } from "../../contexts/api-context";

const Root = () => {
    const { d2 } = useAppContext();
    return <App d2={d2} />;
};

export default Root;
