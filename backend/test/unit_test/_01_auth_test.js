import { check } from "k6";
import options from "../constants/options.js";
import http from "k6/http"
import baseUrl from "../constants/url.js";



export default function(){
    const res=http.post()
}