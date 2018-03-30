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

    getVisualPermissions = async () => {
        var { status } = await Permissions.askAsync( Permissions.CAMERA );
        return status === 'granted';
    }

    getAudioPermissions = async () => {
        var { status } = await Permissions.askAsync( Permissions.AUDIO_RECORDING );
        return status === 'granted';
    }

    getRollPermissions = async () => {
        // Seems to not stop camera opening
        var { status } = await Permissions.askAsync( Permissions.CAMERA_ROLL );
        /** @todo When permissions have been denied, this comes out 'granted'
                when opening camera and then permissions are denied when we
                try to save the recording. */
        this.setState({ debug: JSON.stringify( status ) });
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
            notGranted: notGranted,
        });
    }

    componentWillUnmount () {
        // Stop the recording camera if the app is being exited unexpectedly
        if (this.camera && this.state.recording) {
            this.camera.stopRecording();
            this.setState({ recording: false });
        }
    }

    toggleFacing = () => {
        var direction = this.state.direction === 'back' ? 'front' : 'back';
        this.setState({ direction: direction });
    }

    zoomOut = () => {
        var zoom = this.state.zoom - 0.1 < 0 ? 0 : this.state.zoom - 0.1;
        this.setState({ zoom: zoom });
    }

    zoomIn = () => {
        var zoom = this.state.zoom + 0.1 > 1 ? 1 : this.state.zoom + 0.1;
        this.setState({ zoom: zoom });
    }

    record = (canSave) => {
                    
        /** @todo Do we want to set a maxFileSize? */
        if (this.camera) {

            this.camera.recordAsync().then(( data ) => {
                // Can't vibrate as soon as we get in here
                CameraRoll.saveToCameraRoll( data.uri ).then(( uri ) => {
                    /** @todo Save vid IDs and vid ID to permanent storage so we can fetch them in the future */
                    var ID      = this.state.vidId + 1,
                        uris    = {...this.state.vidURIs};
                    uris[ ID ]  = uri;
                    this.setState({ vidId: ID, vidURIs: uris, });
                    this.props.onStop({ vidId: ID, vidURIs: uris });
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

    renderOverlay = () => {

        var {
            Overlay,
            onCancel,
        } = this.props;

        var {
            recording,
            hasPermissions,
            notGranted,
        } = this.state;

        return (
            <Overlay
                toggleFacing    = { this.toggleFacing }
                zoomIn          = { this.zoomIn }
                zoomOut         = { this.zoomOut }
                debug           = { this.debug }
                stopRecording   = { this.stopRecording }
                record          = { this.record }
                recording       = { recording }
                hasPermissions  = { hasPermissions }
                notGranted      = { notGranted }
                onCancel        = { onCancel } />
        );
    }

    renderWithCamera = ( overlay ) => {

        var { zoom, direction, } = this.state;

        return (
            <Camera
                ref     = { ref => { this.camera = ref; }}
                style   = { styles.camera }
                type    = { direction }
                zoom    = { zoom }>
                    { overlay }
            </Camera>
        );
    }

    render () {

        var { hasPermissions, Overlay, debug } = this.state;

        var overlayWithProps = this.renderOverlay(),
            // Without permissions, will just render permissions denial overlay without camera
            toRender         = overlayWithProps;

        if ( hasPermissions ) {
            // With permissions, will render camera with UI overlay
            toRender = this.renderWithCamera( overlayWithProps );
        }

        // Add this back in for debugging
        // <Text>{ debug }</Text>
        return <View style={styles.container}>
            { toRender }
        </View>
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
});  // End styles


export {
    SimpleCamera,
};
