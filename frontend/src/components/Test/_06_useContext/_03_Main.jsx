import React from 'react'
import { MyContextProvider } from './_01_ContextProvider'
import _02_App from './_02_App'
export default function _03_Main() {
  return (
  <MyContextProvider>
    <_02_App />
  </MyContextProvider>
);
}
