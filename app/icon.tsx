import { ImageResponse } from 'next/og';

// Route segment config
export const runtime = 'edge';

// Image metadata
export const size = {
  width: 32,
  height: 32,
};
export const contentType = 'image/png';

// Image generation
export default function Icon() {
  return new ImageResponse(
    (
      // ImageResponse JSX element
      <div
        style={{
          fontSize: 20,
          background: 'radial-gradient(circle, #022c22 0%, #000000 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#10b981', // emerald-500
          borderRadius: '20%',
          border: '1px solid #059669', // emerald-600
        }}
      >
        <div 
          style={{
             width: '18px',
             height: '14px',
             border: '2px solid #34d399', // emerald-400
             borderRadius: '2px',
             display: 'flex',
             flexDirection: 'column',
             alignItems: 'center',
             justifyContent: 'space-between',
             padding: '1px',
             position: 'relative'
          }}
        >
           {/* Clapper top */}
           <div style={{ width: '100%', height: '3px', background: '#34d399', transform: 'rotate(-15deg)', transformOrigin: 'left bottom', position: 'absolute', top: '-4px', left: '0' }} />
           
           {/* Clapper body stripes */}
           <div style={{ width: '100%', height: '2px', background: '#34d399', marginTop: '4px' }} />
        </div>
      </div>
    ),
    // ImageResponse options
    {
      ...size,
    }
  );
}
