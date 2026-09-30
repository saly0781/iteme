import logo from '../assets/Iteme_logo_animated.svg'

function LoadingSpinner({ size = 'h-10 w-10', className = '' }) {
  return (
    <div className={`flex items-center justify-center ${className}`}>
      <img src={logo} alt="Loading" className={size} />
    </div>
  )
}

export default LoadingSpinner
