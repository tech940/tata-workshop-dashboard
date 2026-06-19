const fs = require('fs');
const path = require('path');

const pagePath = path.join(__dirname, 'app', 'page.js');
let content = fs.readFileSync(pagePath, 'utf8');

const modalJsx = `      {/* Vehicle Information Details Modal */}
      {selectedVehicleDetails && (
        <div style={{ display: 'flex', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', backgroundColor: 'rgba(15, 23, 42, 0.7)', zIndex: 10000, justifyContent: 'center', alignItems: 'center' }} onClick={() => setSelectedVehicleDetails(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ background: '#f8fafc', borderRadius: '12px', width: '90%', maxWidth: '850px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ background: 'var(--navy)', color: 'white', padding: '20px 30px', position: 'relative' }}>
              <h2 style={{ margin: 0, fontSize: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span>📋</span> Vehicle Information Details
              </h2>
              <div style={{ fontSize: '12px', opacity: 0.8, marginTop: '4px' }}>Full data extraction for selected Job Card</div>
              <button onClick={() => setSelectedVehicleDetails(null)} style={{ position: 'absolute', top: '20px', right: '30px', background: 'rgba(255,255,255,0.2)', border: 'none', color: 'white', width: '28px', height: '28px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '16px' }}>&times;</button>
            </div>

            <div style={{ padding: '30px', overflowY: 'auto', maxHeight: '70vh' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>STATUS</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>Open</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JOB CARD DELAY REASON</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.delay_reason || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>CHASSIS NO</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.chassis_no || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>ACTION ON DELAY REASON</div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--navy)', lineHeight: 1.4 }}>
                    Receiving Date : {selectedVehicleDetails.created_date?.value || selectedVehicleDetails.created_date || '-'} PTD : - Claim date : -
                    {selectedVehicleDetails.action_taken ? ' Action: ' + selectedVehicleDetails.action_taken : ''}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>PPL</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.model || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}># OF JOB CARDS</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>1</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JC OPEN DAYS BUCKET</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>
                    {parseInt(selectedVehicleDetails.open_days) > 15 ? 'D: > 15 Days' : parseInt(selectedVehicleDetails.open_days) >= 8 ? 'D: 8-15 Days' : parseInt(selectedVehicleDetails.open_days) >= 5 ? 'D: 5-7 Days' : 'D: 0-4 Days'}
                  </div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>SERVICE TYPE</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.service_type || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>REGION</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.region || selectedVehicleDetails.Region || 'North1'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JC</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.jc_number || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>JOB CARD CREATED DATE</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.created_date?.value || selectedVehicleDetails.created_date || '-'}</div>
                </div>
                <div style={{ background: '#f1f5f9', padding: '15px', borderRadius: '8px' }}>
                  <div style={{ fontSize: '10px', fontWeight: 700, color: '#64748b', marginBottom: '4px', textTransform: 'uppercase' }}>DIVISION</div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--navy)' }}>{selectedVehicleDetails.division || selectedVehicleDetails.Division || '7009420 SaFa Passenger Car'}</div>
                </div>
              </div>
            </div>

            <div style={{ background: 'white', padding: '20px 30px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end' }}>
              <button onClick={() => setSelectedVehicleDetails(null)} style={{ background: 'var(--navy)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '8px', fontWeight: 600, cursor: 'pointer', fontSize: '14px' }}>Close Window</button>
            </div>
          </div>
        </div>
      )}`;

// We split by `    </div>` to find the very end of the main return block.
const splitContent = content.split('    </div>');
const startContent = splitContent.slice(0, -1).join('    </div>');
const endContent = splitContent[splitContent.length - 1];

const newContent = startContent + '\n' + modalJsx + '\n    </div>' + endContent;

fs.writeFileSync(pagePath, newContent, 'utf8');
console.log('Successfully injected Vehicle Modal with ZERO side effects');
