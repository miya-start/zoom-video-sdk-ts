declare global {
  namespace JSX {
    interface IntrinsicElements {
      'video-player-container': React.DetailedHTMLProps<
        React.HTMLAttributes<HTMLDivElement>,
        HTMLDivElement
      >
    }
  }
}

export {}
