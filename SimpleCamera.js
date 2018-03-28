import React, { Component } from 'react';
import { StyleSheet, Text, View, CameraRoll } from 'react-native';
import { Camera, Permissions } from 'expo';


export default class SimpleCamera extends Component {
    state = {
        recording:  false,
        // Doesn't change resolution, but maybe fun and simple to play with
        zoom:       0,
        direction:  'back',
        vidId:      1,
        vidURIs:    {},
        notGranted: [],
        hasPermissions: false,
    };

    async getVisualPermissions () {
        var { status } = await Permissions.askAsync( Permissions.CAMERA );
        return status === 'granted';
    }

    async getAudioPermissions () {
        var { status } = await Permissions.askAsync( Permissions.AUDIO_RECORDING );
        return status === 'granted';
    }

    async getRollPermissions () {
        // Seems to not stop camera opening
        var { status } = await Permissions.askAsync( Permissions.CAMERA_ROLL );
        return status === 'granted';
    }

    async componentWillMount () {

        // On iOS, after initial permissions, if user turns off permissions
        // they won't see another alert. Makes testing harder.
        var notGranted = [];
        var canImage = await this.getVisualPermissions(),
            canAudio = await this.getAudioPermissions(),
            canSave  = await this.getRollPermissions();

        if ( !canImage ) { notGranted.push( 'recording video' ) }
        if ( !canAudio ) { notGranted.push( 'recording sound' ) }
        if ( !canSave ) { notGranted.push( 'saving videos' ) }

        this.setState({
            hasPermissions: canImage && canAudio && canSave,
            notGranted: notGranted
        });
    }

    componentWillUnmount () {
        // Stop the recording camera if the app is being exited unexpectedly
        if (this.camera && this.state.recording) {
            this.camera.stopRecording();
            this.setState({ recording: false });
        }
    }

    toggleFacing () {
        var direction = this.state.direction === 'back' ? 'front' : 'back';
        this.setState({ direction: direction });
    }

    zoomOut () {
        var zoom = this.state.zoom - 0.1 < 0 ? 0 : this.state.zoom - 0.1;
        this.setState({ zoom: zoom });
    }

    zoomIn () {
        var zoom = this.state.zoom + 0.1 > 1 ? 1 : this.state.zoom + 0.1;
        this.setState({ zoom: zoom });
    }

    record = () => {
        /** @todo Do we want to set a maxFileSize? */
        if (this.camera) {

            this.camera.recordAsync().then(( data ) => {
                // Can't vibrate as soon as we get in here
                CameraRoll.saveToCameraRoll( data.uri ).then(( uri ) => {
                    /** @todo Save vid IDs and vid ID to permanent storage so we can fetch them in the future */
                    var ID      = this.state.vidId + 1,
                        uris    = {...this.state.vidURIs}
                    uris[ ID ]  = uri;
                    this.setState({ vidId: ID, vidURIs: uris, debug: uri });
                    this.props.onStop({ vidId: ID, vidURIs: uris, debug: uri });
                });
            });

            this.setState({ recording: true });
        }
    }

    stopRecording = () => {
        // Can't vibrate in here
        if (this.camera) {
            this.camera.stopRecording();
            this.setState({ recording: false });
        }
    }

    renderRecordingButton = ( isRecording ) => {
        var { StyledButton } = this.props;

        if ( isRecording ) {
            return (
                <StyledButton onPress={this.stopRecording} extraStyles={styles.stopButton}>
                    {'X'}
                </StyledButton>
            );
        } else {
            return (
                <StyledButton onPress={this.record} extraStyles={styles.recordButton}>
                    {'O'}
                </StyledButton>
            );
        }
    } 

    renderNoPermissions () {
        var notGranted  = this.state.notGranted,
            length      = notGranted.length,
            kinds       = '';
        if ( length > 1 ) {
            notGranted[ length - 1 ] = 'and ' + notGranted[ length - 1 ];
        }
        if ( length > 2 ) { kinds = notGranted.join(', '); }
        else { kinds = notGranted.join(' '); }

        var message = 'Permissions for ' + kinds + ' have not been granted - cannot open camera preview.';

        return (
            <View style={styles.permissions}>
                <Text style={{ color: 'black' }}>{ message }</Text>
            </View>
        );
    }

    renderCamera () {

        var {
            debug,
            recording,
            zoom,
            direction,
            vidId,
            hasPermissions,
        } = this.state;
        var { StyledButton } = this.props;

        var recordingContent = this.renderRecordingButton( recording );

        return (
            <Camera
                ref     = {ref => { this.camera = ref; }}
                style   = { styles.camera }
                type    = {direction}
                zoom    = {zoom}>
                <View style={styles.topRow}>
                    <StyledButton onPress={this.toggleFacing.bind(this)}>{'FLIP'}</StyledButton>
                </View>
                <View style={styles.bottomRow}>
                    <View style={styles.bottomRowGroup}>
                        <StyledButton onPress={this.zoomIn.bind(this)}>{'+'}</StyledButton>
                        <StyledButton onPress={this.zoomOut.bind(this)}>{'-'}</StyledButton>
                    </View>
                    <View style={styles.bottomRowGroup}>{ recordingContent }</View>
                    <View style={styles.bottomRowGroup}>
                        <StyledButton
                            onPress={this.props.onCancel}
                            extraStyles={styles.cancelButton}
                            textStyles={styles.cancleText}>
                                {'Cancel'}
                        </StyledButton>
                    </View>
                </View>
            </Camera>
        );
    }

    render () {
        const cameraScreenContent = this.state.hasPermissions
            ? this.renderCamera()
            : this.renderNoPermissions();
        return <View style={styles.container}>{ cameraScreenContent }</View>;
    }
}  // End <SimpleCamera>


const styles = StyleSheet.create({
    container: {
        flex:            1,
        alignContent:    'space-between',
        backgroundColor: 'transparent',
    },
    camera: {
        flex:           1,
        justifyContent: 'space-between',
    },
    permissions: {
        flex:           1,
        alignItems:     'center',
        justifyContent: 'center',
        padding:        10,
    },
    topRow: {
        justifyContent: 'space-around',
        flexDirection:  'row',
        marginLeft:     100,
        marginRight:    100,
        marginTop:      20,
    },
    bottomRow: {
        margin:         10,
        flexDirection:  'row',
        justifyContent: 'space-between'
    },
    bottomRowGroup: {
        flex:           0.3,
        flexDirection:  'row',
        alignItems:     'center',
        justifyContent: 'center',
    },
    recordButton:   { backgroundColor: 'darkseagreen', },
    stopButton:     { backgroundColor: 'tomato' },
    cancelButton:   { borderColor: 'tomato' },
    cancleText:     { color: 'black', },
});  // End styles


export {
    SimpleCamera,
};
