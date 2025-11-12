import React, { useContext } from 'react'

export default function _02_App() {
  const context = useContext(MyAppContext)

  return (
    <div>

        {JSON.stringify(context.data)}

    </div>
  )
}
